"use client";

import GoalCard from "./goal-card";
import NewGoalButton from "./new-goal-button";
import type { Goal } from "@/lib/goals";
import EmptyGoals from "@/components/goals/empty-goals";
import { useGoals } from "@/components/goals/goals-provider";

function RecentGoals({ goals }: { goals: Goal[] }) {
  return (
    <section id="metas" aria-labelledby="goals-heading" className="scroll-mt-8">
      <div className="mb-7 flex items-center justify-between gap-4">
        <h2 id="goals-heading" className="text-base font-medium">
          Metas recientes
        </h2>
        <NewGoalButton />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {goals.length > 0 ? (
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
  const { goals } = useGoals();
  return <RecentGoals goals={goals} />;
}
