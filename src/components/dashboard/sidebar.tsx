"use client";

import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import { useGoals } from "@/components/goals/goals-provider";
import GoalSymbol from "@/components/goals/goal-symbol";
import { useLanguage } from "@/components/language-provider";

export default function Sidebar({
  collapsed,
  onToggle,
  page,
  goalId,
}: {
  collapsed: boolean;
  onToggle: () => void;
  page: "Dashboard" | "Metas";
  goalId?: string;
}) {
  const { goals } = useGoals();
  const { t } = useLanguage();
  return (
    <aside
      className={`dashboard-sidebar sticky top-0 flex h-svh shrink-0 flex-col gap-6 border-r border-zinc-800 px-3 pb-3 sm:px-4 sm:pb-4 ${collapsed ? "w-[68px]" : "w-[68px] md:w-[252px]"}`}
      aria-label={t("Barra lateral")}
    >
      <div className="-mx-3 flex h-14 shrink-0 items-center gap-2.5 border-b border-zinc-800 px-4 sm:-mx-4">
        <Image
          src="/Logo.svg"
          alt=""
          width={30}
          height={30}
          className="shrink-0"
          priority
        />
        {!collapsed && (
          <span className="hidden text-[22px] font-semibold tracking-[-0.8px] md:block">
            Ramify
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={t(
            collapsed ? "Expandir barra lateral" : "Contraer barra lateral",
          )}
          aria-expanded={!collapsed}
          className={`paint-hover size-8 shrink-0 items-center justify-center rounded [&>.paint-hover-wash]:shadow-none ${collapsed ? "absolute left-[76px] top-3 z-10 flex" : "ml-auto hidden md:flex"} cursor-pointer text-zinc-400`}
        >
          <PaintHover>
            <Icon name="panel" className="size-[15px]" />
          </PaintHover>
        </button>
      </div>

      <nav
        className="flex flex-col gap-1"
        aria-label={t("Navegación principal")}
      >
        <Link
          href="/dashboard"
          aria-current={page === "Dashboard" ? "page" : undefined}
          title="Dashboard"
          className={`paint-hover flex items-center gap-2.5 rounded px-2.5 py-[9px] text-[13px] ${page === "Dashboard" ? "bg-zinc-900 text-white" : "text-zinc-400"}`}
        >
          <PaintHover>
            <Icon name="home" className="size-[17px] text-zinc-400" />
            {!collapsed && <span className="hidden md:inline">Dashboard</span>}
          </PaintHover>
        </Link>
        <Link
          href="/metas"
          aria-current={page === "Metas" && !goalId ? "page" : undefined}
          title={t("Metas")}
          className={`paint-hover flex items-center gap-2.5 rounded px-2.5 py-[9px] text-[13px] ${!collapsed ? "md:hidden" : ""} ${page === "Metas" ? "bg-zinc-900 text-white" : "text-zinc-400"}`}
        >
          <PaintHover>
            <i
              aria-hidden="true"
              className="bi bi-rocket-takeoff-fill text-[17px] leading-none"
            />
            {!collapsed && (
              <span className="hidden md:inline">{t("Metas")}</span>
            )}
          </PaintHover>
        </Link>
        {!collapsed && (
          <details
            open={page === "Metas"}
            className="sidebar-goals group hidden md:block"
          >
            <summary
              aria-label={t("Metas")}
              className={`paint-hover flex cursor-pointer list-none items-center gap-2.5 rounded px-2.5 py-[9px] text-[13px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white [&::-webkit-details-marker]:hidden ${page === "Metas" ? "bg-zinc-900 text-white" : "text-zinc-400"}`}
            >
              <PaintHover>
                <i
                  aria-hidden="true"
                  className="bi bi-rocket-takeoff-fill text-[17px] leading-none"
                />
                <span className="flex-1">{t("Metas")}</span>
                <Icon
                  name="chevron"
                  className="size-3 text-zinc-400 transition-transform duration-[280ms] ease-[ease] motion-reduce:transition-none group-open:rotate-90"
                />
              </PaintHover>
            </summary>
            <nav
              aria-label={t("Metas del sidebar")}
              className="app-scrollbar ml-[18px] mt-2 flex max-h-[calc(100svh-210px)] flex-col gap-1 overflow-y-auto border-l border-zinc-800 pl-2"
            >
              {goals.map((goal) => (
                <Link
                  key={goal.id}
                  href={`/metas/${goal.id}`}
                  aria-current={goal.id === goalId ? "page" : undefined}
                  title={goal.name}
                  className={`paint-hover flex min-w-0 items-center gap-2 rounded px-2 py-2 text-xs ${goal.id === goalId ? "bg-zinc-900 text-white" : "text-zinc-400"}`}
                >
                  <PaintHover>
                    <span className="flex shrink-0 items-center [&_i]:text-[13px] [&_svg]:size-3.5">
                      <GoalSymbol goal={goal} />
                    </span>
                    <span className="min-w-0 truncate">{goal.name}</span>
                  </PaintHover>
                </Link>
              ))}
              {!goals.length && (
                <span className="px-2 py-2 text-xs text-zinc-500">
                  {t("No hay metas creadas")}
                </span>
              )}
            </nav>
          </details>
        )}
      </nav>
    </aside>
  );
}
