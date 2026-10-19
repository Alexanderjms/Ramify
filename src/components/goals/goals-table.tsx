"use client";

import { useLanguage } from "@/components/language-provider";
import Icon from "@/components/icon";
import type { Goal } from "@/lib/goals";
import { formatGoalActivityTime } from "@/lib/goal-activity-time";
import GoalSymbol from "./goal-symbol";
import Link from "next/link";
import GoalCardMenu from "./goal-card-menu";

export default function GoalsTable({ goals }: { goals: Goal[] }) {
  const { t, language } = useLanguage();
  return (
    <div
      className="app-scrollbar relative w-full min-w-0 overflow-x-auto overscroll-x-contain"
      role="region"
      aria-label={t("Lista de metas")}
      tabIndex={0}
    >
      <table
        className="w-full min-w-[680px] border-collapse text-left text-xs"
        aria-label={t("Metas")}
      >
        <thead className="border-b border-zinc-800 text-[11px] text-zinc-400">
          <tr>
            <th scope="col" className="w-[48%] px-4 pb-3 font-normal">
              {t("Nombre")}
            </th>
            <th scope="col" className="px-4 pb-3 font-normal">
              {t("Estado")}
            </th>
            <th scope="col" className="px-4 pb-3 font-normal">
              {t("Progreso")}
            </th>
            <th scope="col" className="px-4 pb-3 font-normal">
              {t("Tareas")}
            </th>
            <th scope="col" className="whitespace-nowrap px-4 pb-3 font-normal">
              {t("Última actividad")}
            </th>
            <th scope="col" className="w-10 pb-3">
              <span className="sr-only">{t("Opciones")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {goals.map((goal) => {
            const activityTime = formatGoalActivityTime(
              goal.lastActivityAt,
              language,
            );
            return (
              <tr
                key={goal.id ?? goal.name}
                className={`goal-table-row relative border-b border-zinc-800 ${goal.id ? "cursor-pointer" : ""}`}
              >
                <th scope="row" className="px-4 py-5 font-normal">
                  <div className="flex items-center gap-3">
                    <GoalSymbol goal={goal} />
                    <div>
                      {goal.id ? (
                        <Link
                          href={`/metas/${encodeURIComponent(goal.id)}`}
                          className="text-[13px] font-medium text-white after:absolute after:inset-0 after:z-10 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-white"
                        >
                          {goal.name}
                        </Link>
                      ) : (
                        <span className="text-[13px] font-medium text-white">
                          {goal.name}
                        </span>
                      )}
                      <p className="mt-1 text-[11px] leading-[18px] text-zinc-400">
                        {goal.description}
                      </p>
                    </div>
                  </div>
                </th>
                <td className="whitespace-nowrap px-4 py-5">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Icon
                      name={goal.progress === 100 ? "check" : "circle"}
                      className="size-3"
                    />
                    {t(
                      goal.progress === 100
                        ? "Completada"
                        : goal.progress === 0
                          ? "Sin comenzar"
                          : "En progreso",
                    )}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-5 text-[11px] text-zinc-400">
                  {goal.progress}% {t("completado")}
                </td>
                <td className="whitespace-nowrap px-4 py-5 text-[11px] tabular-nums text-zinc-400">
                  {goal.completedTasks} / {goal.tasks}
                </td>
                <td
                  className="whitespace-nowrap px-4 py-5 text-[11px] text-zinc-400"
                  title={activityTime?.title}
                >
                  {activityTime?.text ?? t(goal.activity)}
                </td>
                <td className="pr-4">
                  <GoalCardMenu goal={goal} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
