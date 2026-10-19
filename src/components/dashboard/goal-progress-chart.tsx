"use client";

import { useMemo } from "react";
import Link from "next/link";
import { barX, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import type { Goal } from "@/lib/goals";
import { useLanguage } from "@/components/language-provider";

export default function GoalProgressChart({ goals }: { goals: Goal[] }) {
  const { t } = useLanguage();
  const ranked = useMemo(
    () => [...goals].sort((a, b) => b.progress - a.progress),
    [goals],
  );
  const definition = useMemo(() => {
    const rows = ranked.map((goal, index) => ({
      ...goal,
      key: goal.id ?? String(index),
    }));
    const names = new Map(rows.map((goal) => [goal.key, goal.name]));
    return defineChart({
      marks: [
        barX(rows, {
          x: "progress",
          y: "key",
          key: "key",
          fill: (goal) => goal.color,
          maxThickness: 16,
          radius: 3,
        }),
      ],
      scales: {
        x: {
          scale: scaleLinear().domain([0, 100]),
          grid: true,
          axis: { ticks: { format: (value) => `${value}%` } },
        },
        y: {
          scale: () =>
            scaleBand<string>()
              .domain(rows.map((goal) => goal.key))
              .padding(0.4),
          axis: {
            ticks: {
              format: (value) => {
                const name = names.get(String(value)) ?? "";
                return name.length > 18 ? `${name.slice(0, 17)}…` : name;
              },
            },
          },
        },
      },
      tooltip,
    });
  }, [ranked]);
  return (
    <section
      aria-labelledby="goal-progress-heading"
      className="min-w-0 rounded-[5px] border border-zinc-800 p-4 sm:p-5"
    >
      <h2 id="goal-progress-heading" className="text-sm font-medium">
        {t("Avance por meta")}
      </h2>
      <p className="mt-2 text-xs leading-5 text-zinc-400">
        {t("Compara el porcentaje completado de tus metas.")}
      </p>
      {goals.length ? (
        <>
          <div className="app-scrollbar mt-5 max-h-80 overflow-y-auto">
            <Chart
              definition={definition}
              height={Math.max(160, goals.length * 42 + 32)}
              initialWidth={500}
              ariaLabel={t("Avance por meta")}
            />
          </div>
          <details className="mt-4 border-t border-zinc-800 pt-3 text-xs">
            <summary className="cursor-pointer text-zinc-400">
              {t("Ver datos y abrir metas")}
            </summary>
            <ul className="app-scrollbar mt-3 max-h-60 space-y-3 overflow-y-auto">
              {ranked.map((goal, index) => (
                <li
                  key={goal.id ?? index}
                  className="flex items-start justify-between gap-4"
                >
                  {goal.id ? (
                    <Link
                      href={`/metas/${encodeURIComponent(goal.id)}`}
                      className="min-w-0 break-words text-zinc-300 underline-offset-4 hover:underline"
                    >
                      {goal.name}
                    </Link>
                  ) : (
                    <span className="min-w-0 break-words">{goal.name}</span>
                  )}
                  <span className="shrink-0 tabular-nums">
                    {goal.progress}%
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <p className="py-12 text-center text-xs text-zinc-400">
          {t("Crea una meta para ver su avance.")}
        </p>
      )}
    </section>
  );
}
