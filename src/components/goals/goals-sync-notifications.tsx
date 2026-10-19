"use client";

import type { Goal } from "@/lib/goals";
import { ErrorToast, SyncToast } from "@/components/app-feedback";
import { errorMessage } from "@/lib/feedback";

export default function GoalsSyncNotifications({
  goals,
  userId,
  syncErrors,
  feedbackGoalId,
  onRetry,
}: {
  goals: Goal[];
  userId: string;
  syncErrors: Record<string, number>;
  feedbackGoalId: string | null;
  onRetry: () => void;
}) {
  return (
    <>
      {goals
        .filter((goal) => goal.id !== feedbackGoalId)
        .map((goal) => (
          <SyncToast
            key={goal.id}
            id={`goal-update:${userId}:${goal.id}`}
            pending={Boolean(goal.syncPending)}
            failed={goal.id !== undefined && syncErrors[goal.id] !== undefined}
          />
        ))}
      {Object.entries(syncErrors)
        .filter(([id]) => id !== feedbackGoalId)
        .map(([id, status]) => (
          <ErrorToast
            key={id}
            id={`goal-sync:${userId}:${id}`}
            message={errorMessage(
              { status },
              "Cambios pendientes en este navegador. No se pudieron guardar en Turso.",
            )}
            onRetry={onRetry}
          />
        ))}
    </>
  );
}
