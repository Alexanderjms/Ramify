import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import type { Goal } from "@/lib/goals";
import GoalSymbol from "@/components/goals/goal-symbol";
import Link from "next/link";

export default function GoalCard({ goal }: { goal: Goal }) {
  return (
    <article className="goal-card paint-hover flex min-w-0 cursor-pointer flex-col gap-[18px] rounded-[5px] border border-zinc-800 p-5">
      <PaintHover block>
        <div className="flex items-center justify-between">
          <GoalSymbol goal={goal} />
          <button
            type="button"
            disabled
            aria-label={`Opciones de ${goal.name} (próximamente)`}
            title="Opciones: próximamente"
            className="text-zinc-400"
          >
            <Icon name="more" className="size-4" />
          </button>
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
              {goal.progress === 100
                ? "Completada"
                : goal.progress === 0
                  ? "Sin comenzar"
                  : "En progreso"}
            </span>
            <span className="text-xs">{goal.progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`Progreso de ${goal.name}`}
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
          <span>{goal.tasks} tareas</span>
          <span>{goal.activity}</span>
        </div>
      </PaintHover>
      {goal.id && (
        <Link
          href={`/metas/${encodeURIComponent(goal.id)}`}
          className="absolute inset-0 z-10 rounded-[5px]"
        >
          <span className="sr-only">Abrir meta {goal.name}</span>
        </Link>
      )}
    </article>
  );
}
