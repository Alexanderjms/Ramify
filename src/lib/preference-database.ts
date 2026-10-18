import type { Client } from "@libsql/client";
import {
  defaultUserPreferences,
  parsePreferencesPatch,
  type UserPreferences,
} from "./user-preferences";

const columns = {
  language: "language",
  goalView: "goal_view",
  goalSort: "goal_sort",
  goalStatus: "goal_status",
  sidebarCollapsed: "sidebar_collapsed",
} as const;

export async function loadUserPreferences(
  client: Client,
  userId: string,
): Promise<UserPreferences> {
  const result = await client.execute({
    sql: "SELECT language, goal_view, goal_sort, goal_status, sidebar_collapsed FROM user_preferences WHERE user_id = ?",
    args: [userId],
  });
  const row = result.rows[0];
  if (!row) return { ...defaultUserPreferences };
  return parsePreferencesPatch({
    language: row.language,
    goalView: row.goal_view,
    goalSort: row.goal_sort,
    goalStatus: row.goal_status,
    sidebarCollapsed: row.sidebar_collapsed === 1,
  }) as UserPreferences;
}

export async function saveUserPreferences(
  client: Client,
  userId: string,
  value: unknown,
) {
  const patch = parsePreferencesPatch(value);
  const entries = Object.entries(patch) as [
    keyof UserPreferences,
    string | boolean,
  ][];
  const names = entries.map(([key]) => columns[key]);
  await client.execute({
    sql: `INSERT INTO user_preferences (user_id, ${names.join(", ")}, updated_at)
      VALUES (?, ${names.map(() => "?").join(", ")}, ?)
      ON CONFLICT (user_id) DO UPDATE SET ${names.map((name) => `${name} = excluded.${name}`).join(", ")}, updated_at = excluded.updated_at`,
    args: [
      userId,
      ...entries.map(([, item]) =>
        typeof item === "boolean" ? Number(item) : item,
      ),
      Date.now(),
    ],
  });
}
