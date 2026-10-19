"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import { useGoals } from "@/components/goals/goals-provider";
import GoalSymbol from "@/components/goals/goal-symbol";
import { GoalSidebarSkeleton } from "@/components/goals/goal-loading-skeleton";
import { useLanguage } from "@/components/language-provider";

export default function Sidebar({
  collapsed,
  page,
  goalId,
}: {
  collapsed: boolean;
  page: "Dashboard" | "Metas";
  goalId?: string;
}) {
  const { goals, loading } = useGoals();
  const { t } = useLanguage();
  const [goalsExpanded, setGoalsExpanded] = useState(Boolean(goalId));
  const metasLabel = (
    <>
      <i
        aria-hidden="true"
        className="bi bi-rocket-takeoff-fill shrink-0 text-[17px] leading-none"
      />
      <span className="sidebar-label hidden shrink-0 md:inline">
        {t("Metas")}
      </span>
    </>
  );
  const dashboardLabel = (
    <>
      <Icon name="home" className="size-[17px] shrink-0 text-zinc-400" />
      <span className="sidebar-label hidden shrink-0 md:inline">Dashboard</span>
    </>
  );
  return (
    <aside
      className={`dashboard-sidebar sticky top-0 flex h-svh shrink-0 flex-col gap-6 border-r border-zinc-800 px-3 pb-3 sm:px-4 sm:pb-4 ${collapsed ? "w-[68px]" : "w-[68px] md:w-[252px]"}`}
      aria-label={t("Barra lateral")}
      data-collapsed={collapsed}
    >
      <div className="-mx-3 flex h-14 shrink-0 items-center gap-2.5 border-b border-zinc-800 px-4 sm:-mx-4">
        <Link
          href="/dashboard"
          aria-label="Ramify — Dashboard"
          className="flex min-w-0 items-center gap-2.5 overflow-hidden whitespace-nowrap text-white transition-opacity hover:opacity-80"
        >
          <Image
            src="/icons/ramify-logo.png"
            alt=""
            width={32}
            height={32}
            className="shrink-0"
            priority
          />
          <span className="sidebar-label hidden shrink-0 text-[22px] font-semibold tracking-[-0.8px] md:block">
            Ramify
          </span>
        </Link>
      </div>

      <nav
        className="sidebar-navigation flex flex-col gap-1 overflow-hidden whitespace-nowrap"
        aria-label={t("Navegación principal")}
      >
        <Link
          href="/dashboard"
          aria-current={page === "Dashboard" ? "page" : undefined}
          aria-label="Dashboard"
          className={`${page === "Dashboard" ? "" : "paint-hover"} flex items-center gap-2.5 overflow-hidden rounded px-2.5 py-[9px] text-[13px] ${page === "Dashboard" ? "bg-zinc-900 text-white" : "text-zinc-400"}`}
        >
          {page === "Dashboard" ? (
            dashboardLabel
          ) : (
            <PaintHover>{dashboardLabel}</PaintHover>
          )}
        </Link>
        <div className="sidebar-goals-group">
          <div
            className={`relative flex items-center overflow-hidden rounded ${page === "Metas" ? "bg-zinc-900 text-white" : "text-zinc-400"}`}
          >
            <Link
              href="/metas"
              aria-current={page === "Metas" && !goalId ? "page" : undefined}
              aria-label={t("Metas")}
              className={`${page === "Metas" ? "" : "paint-hover"} flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded px-2.5 py-[9px] text-[13px]`}
            >
              {page === "Metas" ? (
                metasLabel
              ) : (
                <PaintHover>{metasLabel}</PaintHover>
              )}
            </Link>
            <button
              type="button"
              aria-label={t(goalsExpanded ? "Ocultar metas" : "Mostrar metas")}
              aria-expanded={goalsExpanded}
              aria-controls="sidebar-goals-list"
              onClick={() => setGoalsExpanded((open) => !open)}
              className="sidebar-label absolute right-0 top-0.5 hidden size-8 cursor-pointer items-center justify-center rounded text-zinc-400 md:flex"
              inert={collapsed}
            >
              <Icon
                name="chevron"
                className={`size-3 transition-transform duration-[280ms] ease-[ease] motion-reduce:transition-none ${goalsExpanded ? "rotate-90" : ""}`}
              />
            </button>
          </div>
          <div
            id="sidebar-goals-list"
            className="sidebar-goals-content hidden md:grid"
            data-open={goalsExpanded && !collapsed}
            inert={!goalsExpanded || collapsed}
          >
            <div className="sidebar-goals-clip">
              <nav
                aria-label={t("Metas del sidebar")}
                aria-busy={loading && goals.length === 0}
                className="app-scrollbar ml-[18px] mt-2 flex max-h-[calc(100svh-210px)] flex-col gap-1 overflow-y-auto border-l border-zinc-800 pl-2"
              >
                {loading && goals.length === 0 ? (
                  <GoalSidebarSkeleton />
                ) : (
                  goals.map((goal) => {
                    const selected = goal.id === goalId;
                    const content = (
                      <>
                        <span className="flex shrink-0 items-center [&_i]:text-[13px] [&_svg]:size-3.5">
                          <GoalSymbol goal={goal} />
                        </span>
                        <span className="min-w-0 truncate">{goal.name}</span>
                      </>
                    );
                    return (
                      <Link
                        key={goal.id}
                        href={`/metas/${encodeURIComponent(goal.id!)}`}
                        aria-current={selected ? "page" : undefined}
                        aria-label={goal.name}
                        className={`${selected ? "" : "paint-hover"} flex min-w-0 items-center gap-2 rounded px-2 py-2 text-xs ${selected ? "bg-zinc-900 text-white" : "text-zinc-400"}`}
                      >
                        {selected ? (
                          content
                        ) : (
                          <PaintHover>{content}</PaintHover>
                        )}
                      </Link>
                    );
                  })
                )}
                {!loading && !goals.length && (
                  <span className="px-2 py-2 text-xs text-zinc-500">
                    {t("No hay metas creadas")}
                  </span>
                )}
              </nav>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
