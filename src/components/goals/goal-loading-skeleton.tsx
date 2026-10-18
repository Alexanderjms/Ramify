"use client";

import { useLanguage } from "@/components/language-provider";
import Skeleton from "@/components/skeleton";

export function GoalCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="flex min-h-[228px] min-w-0 flex-col gap-[18px] rounded-[5px] border border-zinc-800 p-5"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="size-5 rounded-sm" />
        <Skeleton className="size-7 rounded" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="mt-auto space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-1 w-full rounded-sm" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-20" />
      </div>
    </article>
  );
}

export function GoalTableSkeleton() {
  const { t } = useLanguage();
  return (
    <div
      role="status"
      aria-label={t("Cargando metas…")}
      aria-busy="true"
      className="app-scrollbar w-full overflow-x-auto"
    >
      <span className="sr-only">{t("Cargando metas…")}</span>
      <div aria-hidden="true" className="min-w-[760px] text-left text-xs">
        <div className="grid grid-cols-[48%_1fr_1fr_1fr_1fr_2.5rem] gap-4 border-b border-zinc-800 px-4 pb-3">
          {["w-12", "w-12", "w-14", "w-10", "w-20", "w-4"].map(
            (width, index) => (
              <Skeleton key={index} className={`h-3 ${width}`} />
            ),
          )}
        </div>
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="grid grid-cols-[48%_1fr_1fr_1fr_1fr_2.5rem] items-center gap-4 border-b border-zinc-800 px-4 py-5"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-5 shrink-0" />
              <div className="w-full space-y-2">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GoalSidebarSkeleton() {
  const { t } = useLanguage();
  return (
    <div
      role="status"
      aria-label={t("Cargando metas…")}
      className="space-y-3 px-2 py-2"
    >
      <span className="sr-only">{t("Cargando metas…")}</span>
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} className="h-7 w-full rounded" />
      ))}
    </div>
  );
}

export function GoalDiagramSkeleton() {
  const { t } = useLanguage();
  return (
    <div
      role="status"
      aria-label={t("Cargando meta…")}
      aria-busy="true"
      className="goal-detail min-w-0"
    >
      <span className="sr-only">{t("Cargando meta…")}</span>
      <div className="goal-canvas-wrapper">
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex gap-2">
          <Skeleton className="h-9 w-32 rounded border border-zinc-800" />
          <Skeleton className="size-9 rounded border border-zinc-800" />
        </div>
        <div
          aria-hidden="true"
          className="goal-canvas app-scrollbar relative min-h-[min(70svh,560px)] overflow-hidden"
        >
          <div className="absolute left-16 top-6 h-[440px] w-px bg-zinc-800" />
          <Skeleton className="absolute left-[54px] top-6 size-3 rounded-full" />
          {[0, 1, 2, 3].map((row) => (
            <div
              key={row}
              className="absolute flex items-center"
              style={{ top: `${72 + row * 96}px`, left: "64px" }}
            >
              <span className="h-px w-16 bg-zinc-800" />
              <Skeleton className="size-2.5 rounded-full" />
              <Skeleton className="ml-4 h-10 w-44 rounded border border-zinc-800" />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-4 left-4 flex gap-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton
              key={item}
              className="size-9 rounded border border-zinc-800"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
