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
import { GoalCardSkeleton, GoalTableSkeleton } from "./goal-loading-skeleton";
import { useGoals } from "./goals-provider";
import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";
import { useUserPreferences } from "@/components/user-preferences-provider";

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
  const { goals: allGoals, loading } = useGoals();
  const loadingGoals = loading && allGoals.length === 0;
  const { t, language } = useLanguage();
  const { preferences, updatePreferences } = useUserPreferences();
  const [query, setQuery] = useState("");
  const { goalStatus: status, goalSort: sort, goalView: view } = preferences;
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
      updatePreferences({ goalView: mode });
      return;
    }
    viewTransition.current = document.startViewTransition(() =>
      flushSync(() => updatePreferences({ goalView: mode })),
    );
  }

  const goals = allGoals.filter(
    (goal) =>
      normalize(`${goal.name} ${goal.description}`).includes(
        normalize(query.trim()),
      ) &&
      (status === "Todas" || statusOf(goal) === status),
  );
  if (sort === "name")
    goals.sort((a, b) => a.name.localeCompare(b.name, language));
  if (sort === "activity")
    goals.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0));
  if (sort === "progress") goals.sort((a, b) => b.progress - a.progress);
  if (sort === "least-progress") goals.sort((a, b) => a.progress - b.progress);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="text-[26px] font-semibold leading-normal tracking-[-0.6px]">
            {t("Metas")}
          </h1>
          <p className="mt-[9px] text-[13px] text-zinc-400">
            {t("Consulta y organiza tus metas.")}
          </p>
        </div>
        <NewGoalButton />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <label className="flex min-h-9 w-full items-center gap-2 rounded border border-zinc-800 px-2.5 focus-within:border-zinc-500 sm:w-[270px]">
          <Icon name="search" className="size-3.5 text-zinc-400" />
          <input
            type="search"
            aria-label={t("Buscar metas")}
            placeholder={t("Buscar metas…")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2 text-xs text-white outline-none placeholder:text-zinc-400"
          />
        </label>
        <div className="hidden flex-1 lg:block" />
        <Select
          label="Ordenar metas"
          value={sort}
          onChange={(value) =>
            updatePreferences({ goalSort: value as typeof sort })
          }
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
          aria-label={t("Vista de metas")}
          className="ml-auto flex shrink-0 items-center gap-1 rounded border border-zinc-800 p-1"
        >
          {(["grid", "list"] as const).map((mode) => (
            <TooltipButton
              key={mode}
              type="button"
              aria-label={t(
                mode === "grid" ? "Vista cuadrícula" : "Vista lista",
              )}
              aria-pressed={view === mode}
              onClick={(event) => changeView(mode, event)}
              className={`paint-hover flex cursor-pointer rounded p-1.5 ${view === mode ? "text-white" : "text-zinc-500"}`}
            >
              <PaintHover>
                <Icon name={mode} className="size-[15px]" />
              </PaintHover>
            </TooltipButton>
          ))}
        </div>
      </div>

      <div
        role="group"
        aria-label={t("Filtrar por estado")}
        className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3.5"
      >
        {statuses.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={status === item}
            onClick={() => updatePreferences({ goalStatus: item })}
            className={`paint-hover flex min-h-9 cursor-pointer items-center rounded border px-3 py-2 text-xs ${status === item ? "border-zinc-700 bg-zinc-900 text-white" : "border-transparent text-zinc-400"}`}
          >
            <PaintHover>
              {t(item)}{" "}
              {loadingGoals ? (
                <span
                  aria-hidden="true"
                  className="ml-1 inline-block h-3 w-4 animate-pulse rounded bg-zinc-800/70 motion-reduce:animate-none align-middle"
                />
              ) : item === "Todas" ? (
                allGoals.length
              ) : (
                allGoals.filter((goal) => statusOf(goal) === item).length
              )}
            </PaintHover>
          </button>
        ))}
      </div>

      <section
        aria-label={t("Metas")}
        aria-busy={loadingGoals}
        className={`goals-results ${view === "grid" ? "grid grid-cols-1 gap-4 lg:grid-cols-3" : "min-w-0"}`}
      >
        {loadingGoals ? (
          view === "grid" ? (
            <>
              <span role="status" className="sr-only">
                {t("Cargando metas…")}
              </span>
              {[0, 1, 2].map((item) => (
                <GoalCardSkeleton key={item} />
              ))}
            </>
          ) : (
            <GoalTableSkeleton />
          )
        ) : allGoals.length === 0 ? (
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
            {t("No se encontraron metas con los filtros seleccionados.")}
          </p>
        )}
      </section>
    </>
  );
}
