import type { Goal } from "./goals";
import { flattenActivities } from "./goal-activities";

export function dashboardTasks(goals: Goal[]) {
  return goals.flatMap((goal) =>
    flattenActivities(goal.activities ?? []).map((activity) => ({
      goal,
      activity,
    })),
  );
}
