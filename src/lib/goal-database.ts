import type { Client } from "@libsql/client";
import type { Goal } from "./goals";
import { restoreActivities } from "./activity-database";
import { isGoalIcon } from "./goal-icons";

export type GoalFields = Pick<Goal, "name" | "description" | "icon" | "color">;

export function parseGoalFields(value: unknown): GoalFields {
  if (!value || typeof value !== "object") throw new Error("Invalid goal");
  const goal = value as GoalFields;
  if (
    typeof goal.name !== "string" ||
    !goal.name.trim() ||
    goal.name.trim().length > 100 ||
    typeof goal.description !== "string" ||
    goal.description.length > 1000 ||
    !isGoalIcon(goal.icon) ||
    typeof goal.color !== "string" ||
    !/^#[a-f\d]{6}$/i.test(goal.color)
  )
    throw new Error("Invalid goal");
  return {
    name: goal.name.trim(),
    description: goal.description.trim(),
    icon: goal.icon,
    color: goal.color,
  };
}

export function databaseId(userId: string, goalId: string) {
  return JSON.stringify([userId, goalId]);
}

export async function saveGoal(
  client: Client,
  userId: string,
  goalId: string,
  value: unknown,
) {
  const goal = parseGoalFields(value);
  const now = Date.now();
  await client.execute({
    sql: `INSERT INTO goals (id, user_id, name, description, icon, color, position, updated_at, last_activity_at)
      VALUES (?, ?, ?, ?, ?, ?, (SELECT coalesce(max(position) + 1, 0) FROM goals WHERE user_id = ?), ?, ?)
      ON CONFLICT (id) DO UPDATE SET name = excluded.name, description = excluded.description,
        icon = excluded.icon, color = excluded.color, updated_at = excluded.updated_at,
        last_activity_at = excluded.last_activity_at WHERE goals.user_id = excluded.user_id`,
    args: [
      databaseId(userId, goalId),
      userId,
      goal.name,
      goal.description,
      goal.icon!,
      goal.color,
      userId,
      now,
      now,
    ],
  });
  return goal;
}

export async function deleteGoalRecord(
  client: Client,
  userId: string,
  goalId: string,
) {
  await client.batch(
    [
      {
        sql: "DELETE FROM goal_files WHERE user_id = ? AND id IN (SELECT r.storage_key FROM activity_resources r JOIN activities a ON a.id = r.activity_id WHERE a.goal_id = ?)",
        args: [userId, databaseId(userId, goalId)],
      },
      {
        sql: "DELETE FROM goals WHERE id = ? AND user_id = ?",
        args: [databaseId(userId, goalId), userId],
      },
      {
        sql: "DELETE FROM goal_view_preferences WHERE goal_id = ? AND user_id = ?",
        args: [goalId, userId],
      },
    ],
    "write",
  );
}

export async function listGoals(client: Client, userId: string) {
  const [result, activities, subtasks, resources] = await client.batch(
    [
      {
        sql: "SELECT * FROM goals WHERE user_id = ? ORDER BY position, id",
        args: [userId],
      },
      {
        sql: "SELECT a.* FROM activities a JOIN goals g ON g.id = a.goal_id WHERE g.user_id = ? ORDER BY a.position, a.id",
        args: [userId],
      },
      {
        sql: "SELECT s.*, a.goal_id FROM activity_subtasks s JOIN activities a ON a.id = s.activity_id JOIN goals g ON g.id = a.goal_id WHERE g.user_id = ? ORDER BY s.position, s.id",
        args: [userId],
      },
      {
        sql: "SELECT r.*, a.goal_id FROM activity_resources r JOIN activities a ON a.id = r.activity_id JOIN goals g ON g.id = a.goal_id WHERE g.user_id = ? ORDER BY r.position, r.id",
        args: [userId],
      },
    ],
    "read",
  );
  return result.rows.map((row) => ({
    id: JSON.parse(String(row.id))[1] as string,
    name: String(row.name),
    description: String(row.description),
    icon: String(row.icon),
    color: String(row.color),
    activities: restoreActivities(
      activities.rows.filter((item) => item.goal_id === row.id),
      subtasks.rows.filter((item) => item.goal_id === row.id),
      resources.rows.filter((item) => item.goal_id === row.id),
    ),
    activitiesVersion: Number(row.activities_revision),
    activitiesInitialized: row.activities_hash !== null,
    progress: 0,
    tasks: 0,
    completedTasks: 0,
    lastActivityAt:
      row.last_activity_at === null ? null : Number(row.last_activity_at),
    activity:
      row.last_activity_at === null
        ? "Sin actividad"
        : new Date(Number(row.last_activity_at)).toISOString(),
  }));
}
