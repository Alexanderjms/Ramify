import Icon from "@/components/icon";

export type Goal = {
  name: string;
  description: string;
  color: string;
  progress: number;
  tasks: number;
  activity: string;
};

export default function GoalCard({ goal }: { goal: Goal }) {
  return (
    <article className="flex min-w-0 flex-col gap-[18px] rounded-[5px] border border-zinc-800 p-5">
      <div className="flex items-center justify-between">
        <Icon name="branch" className="size-[19px]" style={{ color: goal.color }} />
        <button type="button" disabled aria-label={`Opciones de ${goal.name} (próximamente)`} title="Opciones: próximamente" className="text-zinc-400">
          <Icon name="more" className="size-4" />
        </button>
      </div>
      <div>
        <h3 className="text-base font-medium">{goal.name}</h3>
        <p className="mt-2 text-xs leading-[18px] text-zinc-400">{goal.description}</p>
      </div>
      <div className="mt-auto">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">En progreso</span>
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
          <div className="h-full rounded-sm bg-blue-500" style={{ width: `${goal.progress}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <span>{goal.tasks} tareas</span>
        <span>{goal.activity}</span>
      </div>
    </article>
  );
}
