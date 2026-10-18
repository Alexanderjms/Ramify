"use client";

import Link from "next/link";
import PaintHover from "@/components/paint-hover";
import { useGoals } from "@/components/goals/goals-provider";
import GoalSymbol from "@/components/goals/goal-symbol";

export default function DashboardHeader({
  collapsed,
  title,
  goalId,
}: {
  collapsed: boolean;
  title: string;
  goalId?: string;
}) {
  const { goals } = useGoals();
  const goal = goalId ? goals.find((goal) => goal.id === goalId) : undefined;
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-zinc-800 px-5 sm:px-8">
      <nav
        aria-label="Ruta de navegación"
        className={`flex min-w-0 items-center gap-[9px] text-xs ${collapsed ? "pl-5" : ""}`}
      >
        {goal ? (
          <>
            <Link
              href="/metas"
              className="shrink-0 text-zinc-400 transition-colors hover:text-white"
            >
              Goals
            </Link>
            <i
              aria-hidden="true"
              className="bi bi-chevron-right shrink-0 text-[10px] leading-none text-zinc-500"
            />
            <span className="flex shrink-0 items-center [&_i]:text-sm [&_svg]:size-3.5">
              <GoalSymbol goal={goal} />
            </span>
            <h1
              title={goal.name}
              className="truncate font-medium"
              aria-current="page"
            >
              {goal.name}
            </h1>
            <span
              role="progressbar"
              aria-label="Progreso de la meta"
              aria-valuenow={goal.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="shrink-0 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400"
            >
              {goal.progress}%
            </span>
          </>
        ) : (
          <span>{title}</span>
        )}
      </nav>
      <div
        className="paint-hover flex shrink-0 items-center gap-2.5 rounded p-1 text-white"
        aria-label="Perfil de Alex"
        title="Alex"
      >
        <PaintHover block>
          <div className="flex size-[30px] shrink-0 items-center justify-center rounded bg-zinc-900 text-[11px]">
            AL
          </div>
          <span className="hidden text-sm font-medium sm:block">Alex</span>
        </PaintHover>
      </div>
    </header>
  );
}
