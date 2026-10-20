"use client";

import GoalCard from "./goal-card";
import NewGoalButton from "./new-goal-button";
import type { Goal } from "@/lib/goals";
import EmptyGoals from "@/components/goals/empty-goals";
import { useGoals } from "@/components/goals/goals-provider";
import { GoalCardSkeleton } from "@/components/goals/goal-loading-skeleton";
import { useLanguage } from "@/components/language-provider";

function RecentGoals({ goals, loading }: { goals: Goal[]; loading: boolean }) {
  const { t } = useLanguage();
  return (
    <section id="metas" aria-labelledby="goals-heading" className="scroll-mt-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <h2 id="goals-heading" className="text-base font-medium">
          {t("Metas recientes")}
        </h2>
        <NewGoalButton />
      </div>
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        aria-busy={loading}
      >
        {loading ? (
          <>
            <span role="status" className="sr-only">
              {t("Cargando metas…")}
            </span>
            {[0, 1, 2].map((item) => (
              <GoalCardSkeleton key={item} />
            ))}
          </>
        ) : goals.length > 0 ? (
          goals.map((goal) => (
            <GoalCard key={goal.id ?? goal.name} goal={goal} />
          ))
        ) : (
          <EmptyGoals />
        )}
      </div>
    </section>
  );
}

export default function DashboardOverview() {
  const { goals, loading } = useGoals();
  return (
    <RecentGoals
      loading={loading && goals.length === 0}
      goals={[...goals]
        .sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0))
        .slice(0, 3)}
    />
  );
}
