"use client";

import { useMemo } from "react";
import { defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { pie, polar, radialArc } from "@tanstack/charts/polar";
import { tooltip } from "@tanstack/charts/tooltip";
import type { dashboardTasks } from "@/lib/dashboard-charts";
import { useLanguage } from "@/components/language-provider";

const statuses = [
  { status: "pending", label: "Pendientes", color: "#71717a" },
  { status: "progress", label: "En progreso", color: "#a78bfa" },
  { status: "completed", label: "Completadas", color: "#34d399" },
] as const;

export default function TaskStatusChart({
  tasks,
}: {
  tasks: ReturnType<typeof dashboardTasks>;
}) {
  const { t } = useLanguage();
  const counts = useMemo(() => {
    const totals = { pending: 0, progress: 0, completed: 0 };
    for (const { activity } of tasks) totals[activity.status]++;
    return totals;
  }, [tasks]);
  const definition = useMemo(() => {
    const rows = statuses
      .map((item) => ({
        label: t(item.label),
        value: counts[item.status],
        color: item.color,
      }))
      .filter((item) => item.value > 0);
    return defineChart({
      marks: [
        polar({
          radiusRatio: 0.94,
          marks: [
            radialArc(pie(rows, { value: "value" }), {
              innerRadius: ({ radius }) => radius * 0.76,
              fill: (row) => row.color,
              key: "label",
            }),
          ],
          scales: { angle: null, radius: null },
        }),
      ],
      scales: { x: null, y: null },
      guides: false,
      margin: 0,
      tooltip,
    });
  }, [counts, t]);
  return (
    <section
      aria-labelledby="task-status-heading"
      className="min-w-0 rounded-[5px] border border-zinc-800 p-4 sm:p-5"
    >
      <h2 id="task-status-heading" className="text-sm font-medium">
        {t("Estado de las tareas")}
      </h2>
      <p className="mt-2 text-xs leading-5 text-zinc-400">
        {t("Todas las ramas, con el mismo conteo de tus metas.")}
      </p>
      <div className="relative mx-auto my-5 size-48">
        {tasks.length ? (
          <Chart
            definition={definition}
            height={192}
            initialWidth={192}
            ariaLabel={t("Estado de las tareas")}
          />
        ) : (
          <div className="size-48 rounded-full border-[22px] border-zinc-800" />
        )}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <span className="text-3xl font-medium tabular-nums">
            {tasks.length}
          </span>
          <span className="mt-1 text-xs text-zinc-400">{t("tareas")}</span>
        </div>
      </div>
      <ul aria-label={t("Estado de las tareas")} className="space-y-3 text-xs">
        {statuses.map((item) => (
          <li key={item.status} className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="text-zinc-300">{t(item.label)}</span>
            <span className="ml-auto tabular-nums">{counts[item.status]}</span>
            <span className="w-10 text-right tabular-nums text-zinc-400">
              {tasks.length
                ? Math.round((counts[item.status] / tasks.length) * 100)
                : 0}
              %
            </span>
          </li>
        ))}
      </ul>
      {!tasks.length && (
        <p className="mt-4 text-xs text-zinc-400">
          {t("Añade ramas a tus metas para ver su distribución.")}
        </p>
      )}
    </section>
  );
}
