import Icon from "@/components/icon";
import GoalCard, { type Goal } from "./goal-card";

const goals: Goal[] = [
  {
    name: "Aprender inglés",
    description: "Práctica de vocabulario, comprensión y conversación.",
    color: "#3B82F6",
    progress: 35,
    tasks: 20,
    activity: "Hace 5 min",
  },
  {
    name: "Aprender programación",
    description: "Fundamentos de programación y desarrollo de proyectos.",
    color: "#A78BFA",
    progress: 52,
    tasks: 25,
    activity: "Hace 1 h",
  },
  {
    name: "Conseguir empleo",
    description: "Gestión de candidaturas y preparación de entrevistas.",
    color: "#64748B",
    progress: 20,
    tasks: 15,
    activity: "Hace 2 h",
  },
];

function GoalsSummary() {
  return (
    <section aria-label="Resumen de objetivos" className="flex flex-wrap items-center gap-x-[52px] gap-y-6 border-y border-zinc-800 py-5">
      {([
        ["branch", "3", "Metas activas"],
        ["check", "23", "Tareas completadas"],
        ["circle", "37", "Tareas pendientes"],
      ] as const).map(([icon, value, label]) => (
        <div key={label} className="flex items-center gap-3">
          <Icon name={icon} className="size-[17px] text-zinc-400" />
          <span className="text-[23px] font-medium leading-normal">{value}</span>
          <span className="text-xs text-zinc-400">{label}</span>
        </div>
      ))}
    </section>
  );
}

function RecentGoals() {
  return (
    <section id="metas" aria-labelledby="goals-heading" className="scroll-mt-8">
      <div className="mb-7 flex items-center justify-between gap-4">
        <h2 id="goals-heading" className="text-base font-medium">Metas recientes</h2>
        <a href="#metas" className="text-right text-[11px] text-zinc-400 hover:text-white">Ver todas las metas →</a>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {goals.map(goal => <GoalCard key={goal.name} goal={goal} />)}
      </div>
    </section>
  );
}

export default function DashboardOverview() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="text-[26px] font-semibold leading-normal tracking-[-0.6px]">Mis objetivos</h1>
          <p className="mt-[9px] text-[13px] text-zinc-400">Resumen de metas, tareas y progreso.</p>
        </div>
        <button type="button" disabled title="Nueva meta: próximamente" className="flex items-center gap-[7px] rounded border border-blue-500 bg-blue-500 px-3 py-2 text-xs font-medium">
          <Icon name="plus" className="size-[15px]" />
          Nueva meta
        </button>
      </div>
      <GoalsSummary />
      <RecentGoals />
    </>
  );
}
