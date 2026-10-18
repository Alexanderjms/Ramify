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
import { validActivities, type GoalActivity } from "@/lib/goal-activities";
import {
  goalsStorageKey,
  initialGoals,
  initialGoalsSnapshot,
  parseGoals,
} from "@/lib/goal-storage";
import NewGoalModal from "./new-goal-modal";

type ActivityUpdate =
  | GoalActivity[]
  | ((current: GoalActivity[]) => GoalActivity[]);
const GoalsContext = createContext<{
  goals: Goal[];
  openCreateGoal: () => void;
  updateActivities: (id: string, activities: ActivityUpdate) => void;
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
        updateActivities: (id, activities) => {
          const current = parseGoals(getSnapshot());
          const goal = current.find((goal) => goal.id === id);
          if (!goal) throw new Error("Goal not found");
          const next =
            typeof activities === "function"
              ? activities(goal.activities ?? [])
              : activities;
          if (!validActivities(next)) throw new Error("Invalid activities");
          localStorage.setItem(
            goalsStorageKey,
            JSON.stringify(
              current.map((goal) =>
                goal.id === id
                  ? { ...goal, activities: next, activity: "Ahora" }
                  : goal,
              ),
            ),
          );
          window.dispatchEvent(new Event("ramify:goals-updated"));
        },
      }}
    >
      {children}
      <NewGoalModal
        dialogRef={dialog}
        onCreate={(goal) => {
          const current = parseGoals(getSnapshot());
          localStorage.setItem(
            goalsStorageKey,
            JSON.stringify([
              {
                ...goal,
                id: crypto.randomUUID(),
                progress: 0,
                tasks: 0,
                completedTasks: 0,
                activity: "Ahora",
              },
              ...current,
            ]),
          );
          window.dispatchEvent(new Event("ramify:goals-updated"));
        }}
      />
    </GoalsContext>
  );
}
