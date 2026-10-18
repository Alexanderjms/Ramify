import type { Goal } from "./goals";
import {
  exampleActivities,
  flattenActivities,
  validActivities,
} from "./goal-activities";

export const goalsStorageKey = "ramify:goals";
export const initialGoals: Goal[] = [
  {
    id: "aprender-ingles",
    name: "Aprender inglés",
    description: "Práctica de vocabulario, comprensión y conversación.",
    icon: "book-fill",
    color: "#A78BFA",
    activities: exampleActivities,
    progress: 35,
    tasks: 20,
    completedTasks: 7,
    activity: "Sin actividad",
  },
];
export const initialGoalsSnapshot = JSON.stringify(initialGoals);

export function parseGoals(snapshot: string): Goal[] {
  const value: unknown = JSON.parse(snapshot);
  if (
    !Array.isArray(value) ||
    !value.every(
      (goal) =>
        goal &&
        typeof goal.id === "string" &&
        goal.id.length > 0 &&
        typeof goal.name === "string" &&
        goal.name.trim().length > 0 &&
        goal.name.length <= 100 &&
        typeof goal.description === "string" &&
        goal.description.length <= 1000 &&
        typeof goal.color === "string" &&
        /^#[a-f\d]{6}$/i.test(goal.color) &&
        (goal.icon === undefined ||
          (typeof goal.icon === "string" &&
            /^[a-z0-9-]+-fill$/.test(goal.icon))) &&
        Number.isFinite(goal.progress) &&
        goal.progress >= 0 &&
        goal.progress <= 100 &&
        Number.isInteger(goal.tasks) &&
        goal.tasks >= 0 &&
        Number.isInteger(goal.completedTasks) &&
        goal.completedTasks >= 0 &&
        goal.completedTasks <= goal.tasks &&
        typeof goal.activity === "string" &&
        (goal.activities === undefined || validActivities(goal.activities)),
    )
  )
    throw new Error("Invalid stored goals");
  return value.map((goal: Goal) => {
    const activities =
      goal.activities ??
      (goal.id === "aprender-ingles" ? exampleActivities : undefined);
    if (!activities) return goal;
    const all = flattenActivities(activities);
    const completedTasks = all.filter(
      (item) => item.status === "completed",
    ).length;
    return {
      ...goal,
      activities,
      tasks: all.length,
      completedTasks,
      progress: all.length
        ? Math.round((completedTasks / all.length) * 100)
        : 0,
    };
  });
}
