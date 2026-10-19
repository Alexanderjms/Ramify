"use client";

import Image from "next/image";
import { useLanguage } from "@/components/language-provider";
import Skeleton from "@/components/skeleton";
import { GoalCardSkeleton } from "@/components/goals/goal-loading-skeleton";

export default function DashboardLoadingSkeleton() {
  const { t } = useLanguage();
  return (
    <main
      role="status"
      aria-label={t("Cargando Ramify…")}
      aria-busy="true"
      className="flex min-h-svh bg-black text-white"
    >
      <span className="sr-only">{t("Cargando Ramify…")}</span>
      <aside className="flex w-[68px] shrink-0 flex-col gap-6 border-r border-zinc-800 px-3 md:w-[252px] md:px-4">
        <div className="flex h-14 items-center gap-2.5 border-b border-zinc-800">
          <Image
            src="/icons/ramify-logo.png"
            alt=""
            width={32}
            height={32}
            priority
          />
          <Skeleton className="hidden h-6 w-20 md:block" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-9 w-full rounded" />
          <Skeleton className="h-9 w-full rounded" />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b border-zinc-800 px-5 sm:px-8">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-32 rounded" />
        </header>
        <section className="flex flex-col gap-7 px-5 pb-5 pt-6 sm:px-8 sm:pb-8">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-9 w-28 rounded" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <GoalCardSkeleton key={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
