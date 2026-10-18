"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Goal } from "@/lib/goals";
import {
  flattenActivities,
  isStoredGoalFile,
  removeActivity,
  validActivities,
  type GoalActivity,
} from "@/lib/goal-activities";
import { removeGoalFile } from "@/lib/goal-files";
import {
  goalsStorageKey,
  initialGoals,
  initialGoalsSnapshot,
  parseGoals,
} from "@/lib/goal-storage";
import NewGoalModal from "./new-goal-modal";

type ActivityUpdate =
  GoalActivity[] | ((current: GoalActivity[]) => GoalActivity[]);
type GoalFields = Pick<Goal, "name" | "description" | "icon" | "color">;
const GoalsContext = createContext<{
  goals: Goal[];
  openCreateGoal: () => void;
  updateActivities: (id: string, activities: ActivityUpdate) => void;
  updateGoal: (id: string, changes: GoalFields) => void;
  deleteGoal: (id: string) => void;
  deleteBranch: (goalId: string, activityId: string) => string[];
} | null>(null);

function subscribe(callback: () => void) {
  try {
    if (localStorage.getItem(goalsStorageKey) === null)
      localStorage.setItem(goalsStorageKey, initialGoalsSnapshot);
  } catch {}
  window.addEventListener("storage", callback);
  window.addEventListener("ramify:goals-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("ramify:goals-updated", callback);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(goalsStorageKey) ?? initialGoalsSnapshot;
  } catch {
    return initialGoalsSnapshot;
  }
}

function storeGoals(goals: Goal[]) {
  const snapshot = JSON.stringify(goals);
  parseGoals(snapshot);
  localStorage.setItem(goalsStorageKey, snapshot);
  window.dispatchEvent(new Event("ramify:goals-updated"));
}

function cleanupFiles(removed: GoalActivity[], remaining: Goal[]) {
  const retainedFiles = new Set(
    remaining.flatMap((goal) =>
      flattenActivities(goal.activities ?? []).flatMap((activity) =>
        (activity.resources ?? []).map((resource) => resource.url),
      ),
    ),
  );
  const files = new Set(
    flattenActivities(removed)
      .flatMap((activity) =>
        (activity.resources ?? []).map((resource) => resource.url),
      )
      .filter((url) => isStoredGoalFile(url) && !retainedFiles.has(url)),
  );
  // Remove blobs only after their references were successfully removed from localStorage.
  void Promise.allSettled([...files].map(removeGoalFile)).then((results) => {
    if (results.some((result) => result.status === "rejected"))
      console.warn("Some deleted attachments could not be cleaned up.");
  });
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (!context) throw new Error("GoalsProvider is required");
  return context;
}

export default function GoalsProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => initialGoalsSnapshot,
  );
  const goals = useMemo(() => {
    try {
      return parseGoals(snapshot);
    } catch {
      return initialGoals;
    }
  }, [snapshot]);
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <GoalsContext
      value={{
        goals,
        openCreateGoal: () => dialog.current?.showModal(),
        updateGoal: (id, changes) => {
          const current = parseGoals(getSnapshot());
          if (!current.some((goal) => goal.id === id))
            throw new Error("Goal not found");
          storeGoals(
            current.map((goal) =>
              goal.id === id
                ? {
                    ...goal,
                    ...changes,
                    name: changes.name.trim(),
                    activity: "Ahora",
                  }
                : goal,
            ),
          );
        },
        deleteGoal: (id) => {
          const current = parseGoals(getSnapshot());
          const goal = current.find((goal) => goal.id === id);
          if (!goal) throw new Error("Goal not found");
          const remaining = current.filter((goal) => goal.id !== id);
          storeGoals(remaining);
          cleanupFiles(goal.activities ?? [], remaining);
        },
        deleteBranch: (goalId, activityId) => {
          const current = parseGoals(getSnapshot());
          const goal = current.find((goal) => goal.id === goalId);
          const branch = flattenActivities(goal?.activities ?? []).find(
            (activity) => activity.id === activityId,
          );
          if (!branch || !goal) throw new Error("Branch not found");
          const remaining = current.map((item) =>
            item.id === goalId
              ? {
                  ...item,
                  activities: removeActivity(item.activities ?? [], activityId),
                  activity: "Ahora",
                }
              : item,
          );
          storeGoals(remaining);
          cleanupFiles([branch], remaining);
          return flattenActivities([branch]).map((activity) => activity.id);
        },
        updateActivities: (id, activities) => {
          const current = parseGoals(getSnapshot());
          const goal = current.find((goal) => goal.id === id);
          if (!goal) throw new Error("Goal not found");
          const next =
            typeof activities === "function"
              ? activities(goal.activities ?? [])
              : activities;
          if (!validActivities(next)) throw new Error("Invalid activities");
          storeGoals(
            current.map((goal) =>
              goal.id === id
                ? { ...goal, activities: next, activity: "Ahora" }
                : goal,
            ),
          );
        },
      }}
    >
      {children}
      <NewGoalModal
        dialogRef={dialog}
        onCreate={(goal) => {
          const current = parseGoals(getSnapshot());
          storeGoals([
            ...current,
            {
              ...goal,
              id: crypto.randomUUID(),
              progress: 0,
              tasks: 0,
              completedTasks: 0,
              activity: "Ahora",
            },
          ]);
        }}
      />
    </GoalsContext>
  );
}
