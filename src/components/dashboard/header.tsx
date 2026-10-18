"use client";

import Link from "next/link";
import { useGoals } from "@/components/goals/goals-provider";
import GoalSymbol from "@/components/goals/goal-symbol";
import { useLanguage } from "@/components/language-provider";
import Tooltip from "@/components/tooltip";
import ProfileMenu from "@/components/dashboard/profile-menu";
import Skeleton from "@/components/skeleton";
import "./header.css";

export default function DashboardHeader({
  collapsed,
  title,
  goalId,
}: {
  collapsed: boolean;
  title: string;
  goalId?: string;
}) {
  const { goals, loading } = useGoals();
  const { t } = useLanguage();
  const goal = goalId ? goals.find((goal) => goal.id === goalId) : undefined;
  return (
    <header className="flex h-14 min-w-0 items-center justify-between gap-2 border-b border-zinc-800 px-3 sm:gap-4 sm:px-8">
      <nav
        aria-label={t("Ruta de navegación")}
        data-sidebar-collapsed={collapsed}
        className="dashboard-breadcrumb flex min-w-0 items-center gap-[9px] text-xs"
      >
        {goal ? (
          <>
            <Link
              href="/metas"
              className="shrink-0 text-zinc-400 transition-colors hover:text-white"
            >
              {t("Metas")}
            </Link>
            <i
              aria-hidden="true"
              className="bi bi-chevron-right shrink-0 text-[10px] leading-none text-zinc-500"
            />
            <span className="hidden shrink-0 items-center sm:flex [&_i]:text-sm [&_svg]:size-3.5">
              <GoalSymbol goal={goal} />
            </span>
            <Tooltip content={goal.name}>
              <h1
                tabIndex={0}
                className="truncate font-medium"
                aria-current="page"
              >
                {goal.name}
              </h1>
            </Tooltip>
            <span
              role="progressbar"
              aria-label={t("Progreso de la meta")}
              aria-valuenow={goal.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="hidden shrink-0 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400 min-[400px]:inline-flex"
            >
              {goal.progress}%
            </span>
          </>
        ) : goalId && loading && !goals.some((item) => item.id === goalId) ? (
          <div
            role="status"
            aria-label={t("Cargando meta…")}
            className="flex items-center gap-2"
          >
            <Skeleton className="h-3 w-12" />
            <i
              aria-hidden="true"
              className="bi bi-chevron-right text-[10px] text-zinc-500"
            />
            <Skeleton className="size-3.5 rounded-sm" />
            <Skeleton className="h-3 w-28" />
          </div>
        ) : (
          <span>{t(title)}</span>
        )}
      </nav>
      <ProfileMenu />
    </header>
  );
}
