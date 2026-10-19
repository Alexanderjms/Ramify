import type { Client } from "@libsql/client";
import { validInputId } from "./input-validation";

export type GoalView = {
  zoom: number;
  scrollLeft: number;
  scrollTop: number;
  collapsed: string[];
};

export const defaultGoalView: GoalView = {
  zoom: 1,
  scrollLeft: 0,
  scrollTop: 0,
  collapsed: ["modulo-1"],
};

export function validGoalId(id: string): boolean {
  return validInputId(id);
}

export function parseGoalView(value: unknown): GoalView {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid view");
  const view = value as GoalView;
  if (
    !Number.isFinite(view.zoom) ||
    view.zoom < 0.35 ||
    view.zoom > 2 ||
    !Number.isFinite(view.scrollLeft) ||
    view.scrollLeft < 0 ||
    view.scrollLeft > 10000000 ||
    !Number.isFinite(view.scrollTop) ||
    view.scrollTop < 0 ||
    view.scrollTop > 10000000 ||
    !Array.isArray(view.collapsed) ||
    view.collapsed.length > 2000 ||
    !view.collapsed.every((id) => typeof id === "string" && validGoalId(id))
  )
    throw new Error("Invalid view");
  return {
    zoom: view.zoom,
    scrollLeft: view.scrollLeft,
    scrollTop: view.scrollTop,
    collapsed: [...new Set(view.collapsed)],
  };
}

export async function loadGoalView(
  client: Client,
  userId: string,
  goalId: string,
): Promise<GoalView> {
  if (!validGoalId(goalId)) throw new Error("Invalid goal ID");
  const result = await client.execute({
    sql: "SELECT zoom, scroll_left, scroll_top, collapsed_ids FROM goal_view_preferences WHERE user_id = ? AND goal_id = ?",
    args: [userId, goalId],
  });
  const row = result.rows[0];
  return row
    ? parseGoalView({
        zoom: row.zoom,
        scrollLeft: row.scroll_left,
        scrollTop: row.scroll_top,
        collapsed: JSON.parse(String(row.collapsed_ids)),
      })
    : { ...defaultGoalView, collapsed: [...defaultGoalView.collapsed] };
}

export async function saveGoalView(
  client: Client,
  userId: string,
  goalId: string,
  value: unknown,
): Promise<void> {
  if (!validGoalId(goalId)) throw new Error("Invalid goal ID");
  const view = parseGoalView(value);
  await client.execute({
    sql: `INSERT INTO goal_view_preferences (user_id, goal_id, zoom, scroll_left, scroll_top, collapsed_ids, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, goal_id) DO UPDATE SET
        zoom = excluded.zoom, scroll_left = excluded.scroll_left, scroll_top = excluded.scroll_top,
        collapsed_ids = excluded.collapsed_ids, updated_at = excluded.updated_at`,
    args: [
      userId,
      goalId,
      view.zoom,
      view.scrollLeft,
      view.scrollTop,
      JSON.stringify(view.collapsed),
      Date.now(),
    ],
  });
}
