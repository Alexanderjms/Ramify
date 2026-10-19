import { createHash } from "node:crypto";
import type { Client, InStatement, Row } from "@libsql/client";
import {
  isStoredGoalFile,
  validActivities,
  type GoalActivity,
} from "./goal-activities";
import { databaseId, parseGoalFields } from "./goal-database";

export class ActivityError extends Error {
  constructor(public status: number) {
    super("Could not save diagram");
  }
}

type ActivityEntry = {
  item: GoalActivity;
  id: string;
  parent: string | null;
  position: number;
};

function entries(
  items: GoalActivity[],
  goalId: string,
  parent: string | null = null,
): ActivityEntry[] {
  return items.flatMap((item, position) => {
    const id = JSON.stringify([goalId, item.id]);
    return [
      { item, id, parent, position },
      ...entries(item.children ?? [], goalId, id),
    ];
  });
}

export function parseActivityTree(value: unknown): GoalActivity[] {
  if (!validActivities(value)) throw new ActivityError(400);
  function clean(items: GoalActivity[]): GoalActivity[] {
    return items.map((item) => {
      if (
        item.id.length > 128 ||
        item.resources?.some((resource) => resource.id.length > 128) ||
        item.subtasks?.some((task) => task.id.length > 128)
      )
        throw new ActivityError(400);
      return {
        id: item.id,
        name: item.name.trim(),
        color: item.color,
        status: item.status,
        description: item.description ?? "",
        notes: item.notes ?? "",
        priority: item.priority ?? "medium",
        targetDate: item.targetDate || "",
        ...(item.children?.length ? { children: clean(item.children) } : {}),
        subtasks: (item.subtasks ?? []).map((task) => ({
          id: task.id,
          name: task.name.trim(),
          status: task.status,
        })),
        resources: (item.resources ?? []).map((resource) => ({
          id: resource.id,
          url: resource.url,
          ...(resource.name ? { name: resource.name } : {}),
          ...(resource.fileName ? { fileName: resource.fileName } : {}),
        })),
      };
    });
  }
  return clean(value);
}

export function restoreActivities(
  activityRows: Row[],
  subtaskRows: Row[],
  resourceRows: Row[],
): GoalActivity[] {
  const items = new Map<string, GoalActivity>();
  const roots: GoalActivity[] = [];
  for (const row of activityRows)
    items.set(String(row.id), {
      id: JSON.parse(String(row.id))[1],
      name: String(row.name),
      color: String(row.color),
      status: row.status as GoalActivity["status"],
      description: String(row.description),
      notes: String(row.notes),
      priority: row.priority as GoalActivity["priority"],
      targetDate: row.target_date === null ? "" : String(row.target_date),
      children: [],
      subtasks: [],
      resources: [],
    });
  for (const row of activityRows) {
    const item = items.get(String(row.id))!;
    if (row.parent_id === null) roots.push(item);
    else items.get(String(row.parent_id))?.children!.push(item);
  }
  for (const row of subtaskRows)
    items.get(String(row.activity_id))?.subtasks!.push({
      id: JSON.parse(String(row.id))[1],
      name: String(row.name),
      status: row.status as "pending" | "completed",
    });
  for (const row of resourceRows)
    items.get(String(row.activity_id))?.resources!.push({
      id: JSON.parse(String(row.id))[1],
      url: String(row.kind === "file" ? row.storage_key : row.url),
      ...(row.name === null ? {} : { name: String(row.name) }),
      ...(row.kind === "file" ? { fileName: String(row.file_name) } : {}),
    });
  for (const item of items.values()) {
    if (!item.children?.length) delete item.children;
  }
  return roots;
}

export async function saveActivities(
  client: Client,
  userId: string,
  localGoalId: string,
  value: unknown,
  version: number,
  metadata: unknown,
) {
  const activities = parseActivityTree(value);
  if (!Number.isSafeInteger(version) || version < 0)
    throw new ActivityError(400);
  let goal;
  try {
    goal = parseGoalFields(metadata);
  } catch {
    throw new ActivityError(400);
  }
  const goalId = databaseId(userId, localGoalId);
  const hash = createHash("sha256")
    .update(JSON.stringify(activities))
    .digest("hex");
  const tree = entries(activities, goalId);
  const transaction = await client.transaction("write");
  try {
    if (version === 0)
      await transaction.execute({
        sql: `INSERT INTO goals (id, user_id, name, description, icon, color, position)
        VALUES (?, ?, ?, ?, ?, ?, (SELECT coalesce(max(position) + 1, 0) FROM goals WHERE user_id = ?)) ON CONFLICT (id) DO NOTHING`,
        args: [
          goalId,
          userId,
          goal.name,
          goal.description,
          goal.icon!,
          goal.color,
          userId,
        ],
      });
    const results = await transaction.batch([
      {
        sql: "SELECT activities_revision, activities_hash FROM goals WHERE id = ? AND user_id = ?",
        args: [goalId, userId],
      },
      { sql: "SELECT * FROM activities WHERE goal_id = ?", args: [goalId] },
      {
        sql: "SELECT s.* FROM activity_subtasks s JOIN activities a ON a.id = s.activity_id WHERE a.goal_id = ?",
        args: [goalId],
      },
      {
        sql: "SELECT r.* FROM activity_resources r JOIN activities a ON a.id = r.activity_id WHERE a.goal_id = ?",
        args: [goalId],
      },
      {
        sql: "SELECT id, file_name, mime_type, size_bytes FROM goal_files WHERE user_id = ? AND ready = 1",
        args: [userId],
      },
    ]);
    const current = results[0].rows[0];
    if (!current) throw new ActivityError(404);
    if (current.activities_hash === hash) {
      await transaction.commit();
      return Number(current.activities_revision);
    }
    if (Number(current.activities_revision) !== version)
      throw new ActivityError(409);
    const oldActivities = new Map(
      results[1].rows.map((row) => [String(row.id), row]),
    );
    const oldSubtasks = new Map(
      results[2].rows.map((row) => [String(row.id), row]),
    );
    const oldResources = new Map(
      results[3].rows.map((row) => [String(row.id), row]),
    );
    const files = new Map(results[4].rows.map((row) => [String(row.id), row]));
    const statements: InStatement[] = [];
    const now = Date.now();
    for (const { id, parent } of tree) {
      if (oldActivities.has(id) && oldActivities.get(id)!.parent_id !== parent)
        statements.push({
          sql: "UPDATE activities SET parent_id = NULL WHERE id = ?",
          args: [id],
        });
    }
    for (const { item, id, position } of tree) {
      const old = oldActivities.get(id);
      const values = [
        item.name,
        item.color,
        item.status,
        item.description!,
        item.priority!,
        item.targetDate || null,
        item.notes!,
        position,
      ];
      const columns = [
        "name",
        "color",
        "status",
        "description",
        "priority",
        "target_date",
        "notes",
        "position",
      ];
      if (
        !old ||
        columns.some((column, index) => old[column] !== values[index])
      )
        statements.push({
          sql: `INSERT INTO activities (id, goal_id, name, color, status, description, priority, target_date, notes, position, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET
          name = excluded.name, color = excluded.color, status = excluded.status, description = excluded.description,
          priority = excluded.priority, target_date = excluded.target_date, notes = excluded.notes, position = excluded.position, updated_at = excluded.updated_at`,
          args: [id, goalId, ...values, now],
        });
    }
    for (const { id, parent } of tree) {
      if (parent !== null && oldActivities.get(id)?.parent_id !== parent)
        statements.push({
          sql: "UPDATE activities SET parent_id = ? WHERE id = ?",
          args: [parent, id],
        });
    }
    const subtaskIds: string[] = [];
    const resourceIds: string[] = [];
    const resourceStatements: InStatement[] = [];
    const fileIds = new Set<string>();
    for (const { item, id } of tree) {
      for (const [position, task] of item.subtasks!.entries()) {
        const taskId = JSON.stringify([id, task.id]);
        subtaskIds.push(taskId);
        const old = oldSubtasks.get(taskId);
        if (
          !old ||
          old.name !== task.name ||
          old.status !== task.status ||
          old.position !== position
        )
          statements.push({
            sql: `INSERT INTO activity_subtasks (id, activity_id, name, status, position, updated_at) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET name = excluded.name, status = excluded.status, position = excluded.position, updated_at = excluded.updated_at`,
            args: [taskId, id, task.name, task.status, position, now],
          });
      }
      for (const [position, resource] of item.resources!.entries()) {
        const resourceId = JSON.stringify([id, resource.id]);
        resourceIds.push(resourceId);
        const file = resource.fileName ? files.get(resource.url) : undefined;
        if (
          resource.fileName &&
          (!isStoredGoalFile(resource.url) ||
            !file ||
            file.file_name !== resource.fileName ||
            fileIds.has(resource.url))
        )
          throw new ActivityError(400);
        if (file) fileIds.add(resource.url);
        const values = [
          file ? "file" : "link",
          file ? null : resource.url,
          file ? resource.url : null,
          resource.fileName ?? null,
          file?.mime_type ?? null,
          file?.size_bytes ?? null,
          position,
          resource.name ?? null,
        ];
        const columns = [
          "kind",
          "url",
          "storage_key",
          "file_name",
          "mime_type",
          "size_bytes",
          "position",
          "name",
        ];
        const old = oldResources.get(resourceId);
        if (
          !old ||
          columns.some((column, index) => old[column] !== values[index])
        )
          resourceStatements.push({
            sql: `INSERT INTO activity_resources (id, activity_id, kind, url, storage_key, file_name, mime_type, size_bytes, position, name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET
            kind = excluded.kind, url = excluded.url, storage_key = excluded.storage_key, file_name = excluded.file_name,
            mime_type = excluded.mime_type, size_bytes = excluded.size_bytes, position = excluded.position, name = excluded.name`,
            args: [resourceId, id, ...values],
          });
      }
    }
    statements.push(
      {
        sql: "DELETE FROM activity_subtasks WHERE activity_id IN (SELECT id FROM activities WHERE goal_id = ?) AND id NOT IN (SELECT value FROM json_each(?))",
        args: [goalId, JSON.stringify(subtaskIds)],
      },
      {
        sql: "DELETE FROM activity_resources WHERE activity_id IN (SELECT id FROM activities WHERE goal_id = ?) AND id NOT IN (SELECT value FROM json_each(?))",
        args: [goalId, JSON.stringify(resourceIds)],
      },
      ...resourceStatements,
      {
        sql: "DELETE FROM activities WHERE goal_id = ? AND id NOT IN (SELECT value FROM json_each(?))",
        args: [goalId, JSON.stringify(tree.map((entry) => entry.id))],
      },
      {
        sql: "DELETE FROM goal_files WHERE user_id = ? AND id IN (SELECT value FROM json_each(?)) AND NOT EXISTS (SELECT 1 FROM activity_resources r WHERE r.storage_key = goal_files.id)",
        args: [
          userId,
          JSON.stringify(
            results[3].rows.map((row) => row.storage_key).filter(Boolean),
          ),
        ],
      },
      {
        sql: "UPDATE goals SET activities_revision = activities_revision + 1, activities_hash = ?, updated_at = ?, last_activity_at = ? WHERE id = ? AND user_id = ?",
        args: [hash, now, now, goalId, userId],
      },
    );
    for (let offset = 0; offset < statements.length; offset += 100)
      await transaction.batch(statements.slice(offset, offset + 100));
    await transaction.commit();
    return version + 1;
  } catch (error) {
    if (!transaction.closed) await transaction.rollback();
    throw error;
  } finally {
    transaction.close();
  }
}
