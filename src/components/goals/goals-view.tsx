"use client";

import { useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import Select from "@/components/select";
import GoalCard from "@/components/dashboard/goal-card";
import NewGoalButton from "@/components/dashboard/new-goal-button";
import GoalsTable from "./goals-table";
import type { Goal } from "@/lib/goals";
import EmptyGoals from "./empty-goals";
import { useGoals } from "./goals-provider";

const statuses = [
  "Todas",
  "En progreso",
  "Sin comenzar",
  "Completadas",
] as const;
type Status = (typeof statuses)[number];
const statusOf = (goal: Goal): Status =>
  goal.progress === 100
    ? "Completadas"
    : goal.progress === 0
      ? "Sin comenzar"
      : "En progreso";
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");

export default function GoalsView() {
  const { goals: allGoals } = useGoals();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("Todas");
  const [sort, setSort] = useState("activity");
  const [view, setView] = useState<"grid" | "list">("grid");
  const viewTransition = useRef<ViewTransition | null>(null);

  function changeView(
    mode: "grid" | "list",
    event: MouseEvent<HTMLButtonElement>,
  ) {
    if (mode === view) return;
    viewTransition.current?.skipTransition();
    if (
      !document.startViewTransition ||
      event.detail === 0 ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setView(mode);
      return;
    }
    viewTransition.current = document.startViewTransition(() =>
      flushSync(() => setView(mode)),
    );
  }

  const goals = allGoals.filter(
    (goal) =>
      normalize(`${goal.name} ${goal.description}`).includes(
        normalize(query.trim()),
      ) &&
      (status === "Todas" || statusOf(goal) === status),
  );
  if (sort === "name") goals.sort((a, b) => a.name.localeCompare(b.name, "es"));
  if (sort === "progress") goals.sort((a, b) => b.progress - a.progress);
  if (sort === "least-progress") goals.sort((a, b) => a.progress - b.progress);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="text-[26px] font-semibold leading-normal tracking-[-0.6px]">
            Goals
          </h1>
          <p className="mt-[9px] text-[13px] text-zinc-400">
            Consulta y organiza tus metas.
          </p>
        </div>
        <NewGoalButton />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex min-h-9 w-full items-center gap-2 rounded border border-zinc-800 px-2.5 focus-within:border-zinc-500 sm:w-[270px]">
          <Icon name="search" className="size-3.5 text-zinc-400" />
          <input
            type="search"
            aria-label="Buscar metas"
            placeholder="Buscar metas…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2 text-xs text-white outline-none placeholder:text-zinc-400"
          />
        </label>
        <div className="hidden flex-1 lg:block" />
        <Select
          label="Ordenar metas"
          value={sort}
          onChange={setSort}
          options={[
            { value: "activity", label: "Última actividad" },
            { value: "name", label: "Nombre" },
            { value: "progress", label: "Mayor progreso" },
            { value: "least-progress", label: "Menor progreso" },
          ]}
          icon={<Icon name="sort" className="size-[15px] text-zinc-400" />}
        />
        <div
          role="group"
          aria-label="Vista de metas"
          className="flex items-center gap-1 rounded border border-zinc-800 p-1"
        >
          {(["grid", "list"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-label={mode === "grid" ? "Vista cuadrícula" : "Vista lista"}
              aria-pressed={view === mode}
              onClick={(event) => changeView(mode, event)}
              className={`paint-hover flex cursor-pointer rounded p-1.5 ${view === mode ? "text-white" : "text-zinc-500"}`}
            >
              <PaintHover>
                <Icon name={mode} className="size-[15px]" />
              </PaintHover>
            </button>
          ))}
        </div>
      </div>

      <div
        role="group"
        aria-label="Filtrar por estado"
        className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3.5"
      >
        {statuses.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={status === item}
            onClick={() => setStatus(item)}
            className={`paint-hover flex min-h-9 cursor-pointer items-center rounded border px-3 py-2 text-xs ${status === item ? "border-zinc-700 bg-zinc-900 text-white" : "border-transparent text-zinc-400"}`}
          >
            <PaintHover>
              {item}{" "}
              {item === "Todas"
                ? allGoals.length
                : allGoals.filter((goal) => statusOf(goal) === item).length}
            </PaintHover>
          </button>
        ))}
      </div>

      <section
        aria-label="Metas"
        className={`goals-results ${view === "grid" ? "grid grid-cols-1 gap-4 lg:grid-cols-3" : "min-w-0"}`}
      >
        {allGoals.length === 0 ? (
          <EmptyGoals />
        ) : view === "grid" ? (
          goals.map((goal) => (
            <GoalCard key={goal.id ?? goal.name} goal={goal} />
          ))
        ) : (
          <GoalsTable goals={goals} />
        )}
        {allGoals.length > 0 && goals.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-zinc-400">
            No se encontraron metas con los filtros seleccionados.
          </p>
        )}
      </section>
    </>
  );
}
