"use client";

import GradientASCII from "@/components/GradientASCII";
import Skeleton from "@/components/skeleton";
import { useLanguage } from "@/components/language-provider";

export default function LoginLoadingSkeleton() {
  const { t } = useLanguage();
  return (
    <main
      className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-[#050609] px-6 text-zinc-400"
      role="status"
      aria-label={t("Cargando inicio de sesión…")}
      aria-busy="true"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[#050609]"
        aria-hidden="true"
      >
        <GradientASCII fontFamily="monospace" />
        <div className="absolute inset-0 bg-black/30" />
      </div>
      <span className="sr-only">{t("Cargando inicio de sesión…")}</span>
      <div
        aria-hidden="true"
        className="w-full max-w-[380px] rounded-2xl border border-white/15 bg-[#090b10]/50 px-7 py-10 text-center shadow-2xl backdrop-blur-xl sm:px-9"
      >
        <Skeleton className="mx-auto mb-6 size-[72px] rounded-xl" />
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto mt-4 h-4 w-64 max-w-full" />
        <Skeleton className="mx-auto mt-2 h-4 w-52 max-w-full" />
        <Skeleton className="mt-8 h-12 w-full rounded-lg" />
      </div>
    </main>
  );
}
