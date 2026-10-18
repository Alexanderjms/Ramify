"use client";

import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";
import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import type { Goal } from "@/lib/goals";
import GoalSymbol from "@/components/goals/goal-symbol";
import Link from "next/link";

export default function GoalCard({ goal }: { goal: Goal }) {
  const { t } = useLanguage();
  return (
    <article className="goal-card paint-hover flex min-w-0 cursor-pointer flex-col gap-[18px] rounded-[5px] border border-zinc-800 p-5">
      <PaintHover block>
        <div className="flex items-center justify-between">
          <GoalSymbol goal={goal} />
          <TooltipButton
            type="button"
            disabled
            aria-label={`${t("Opciones de")} ${goal.name} ${t("(próximamente)")}`}
            title={t("Opciones: próximamente")}
            className="relative z-20 text-zinc-400"
          >
            <Icon name="more" className="size-4" />
          </TooltipButton>
        </div>
        <div>
          <h3 className="text-base font-medium">{goal.name}</h3>
          <p className="mt-2 text-xs leading-[18px] text-zinc-400">
            {goal.description}
          </p>
        </div>
        <div className="mt-auto">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              {t(
                goal.progress === 100
                  ? "Completada"
                  : goal.progress === 0
                    ? "Sin comenzar"
                    : "En progreso",
              )}
            </span>
            <span className="text-xs">{goal.progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`${t("Progreso de")} ${goal.name}`}
            aria-valuenow={goal.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1 overflow-hidden rounded-sm bg-zinc-800"
          >
            <div
              className="h-full rounded-sm bg-white"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span>
            {goal.tasks} {t("tareas")}
          </span>
          <span>{t(goal.activity)}</span>
        </div>
      </PaintHover>
      {goal.id && (
        <Link
          href={`/metas/${encodeURIComponent(goal.id)}`}
          className="absolute inset-0 z-10 rounded-[5px]"
        >
          <span className="sr-only">
            {t("Abrir meta")} {goal.name}
          </span>
        </Link>
      )}
    </article>
  );
}
