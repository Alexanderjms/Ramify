"use client";

import Link from "next/link";
import PaintHover from "@/components/paint-hover";
import { useGoals } from "@/components/goals/goals-provider";
import GoalSymbol from "@/components/goals/goal-symbol";
import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { logout } from "@/app/account-actions";
import { useLanguage } from "@/components/language-provider";
import Select from "@/components/select";
import "./header.css";

function LogoutButton() {
  const { pending } = useFormStatus();
  const { t } = useLanguage();
  return (
    <button type="submit" className="profile-signout" disabled={pending}>
      <i aria-hidden="true" className="bi bi-box-arrow-right" />
      {t(pending ? "Cerrando sesión…" : "Cerrar sesión")}
    </button>
  );
}

export default function DashboardHeader({
  collapsed,
  title,
  goalId,
}: {
  collapsed: boolean;
  title: string;
  goalId?: string;
}) {
  const { goals } = useGoals();
  const { language, setLanguage, t } = useLanguage();
  const menuId = useId();
  const [error, setError] = useState(false);
  const goal = goalId ? goals.find((goal) => goal.id === goalId) : undefined;
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-zinc-800 px-5 sm:px-8">
      <nav
        aria-label={t("Ruta de navegación")}
        className={`flex min-w-0 items-center gap-[9px] text-xs ${collapsed ? "pl-5" : ""}`}
      >
        {goal ? (
          <>
            <Link
              href="/metas"
              className="shrink-0 text-zinc-400 transition-colors hover:text-white"
            >
              {t("Metas")}
            </Link>
            <i
              aria-hidden="true"
              className="bi bi-chevron-right shrink-0 text-[10px] leading-none text-zinc-500"
            />
            <span className="flex shrink-0 items-center [&_i]:text-sm [&_svg]:size-3.5">
              <GoalSymbol goal={goal} />
            </span>
            <h1
              title={goal.name}
              className="truncate font-medium"
              aria-current="page"
            >
              {goal.name}
            </h1>
            <span
              role="progressbar"
              aria-label={t("Progreso de la meta")}
              aria-valuenow={goal.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="shrink-0 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400"
            >
              {goal.progress}%
            </span>
          </>
        ) : (
          <span>{t(title)}</span>
        )}
      </nav>
      <button
        type="button"
        popoverTarget={menuId}
        aria-haspopup="dialog"
        className="profile-trigger paint-hover flex shrink-0 cursor-pointer items-center gap-2.5 rounded p-1 text-white"
        aria-label={t("Perfil de Alex")}
        title="Alex"
      >
        <PaintHover>
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded bg-zinc-900 text-[11px]">
            AL
          </span>
          <span className="hidden text-sm font-medium sm:block">Alex</span>
          <i
            aria-hidden="true"
            className="bi bi-chevron-down text-[10px] text-zinc-400"
          />
        </PaintHover>
      </button>
      <div
        id={menuId}
        popover="auto"
        role="dialog"
        aria-label={t("Perfil de Alex")}
        className="profile-popover"
        onToggle={(event) => {
          if (event.newState === "open") {
            setError(false);
            event.currentTarget
              .querySelector<HTMLButtonElement>('[role="combobox"]')
              ?.focus({ preventScroll: true });
          }
        }}
      >
        <div className="profile-language">
          <span>
            <i aria-hidden="true" className="bi bi-translate" />
            {t("Idioma")}
          </span>
          <Select
            label={t("Idioma")}
            value={language}
            options={[
              { value: "es", label: "Español" },
              { value: "en", label: "English" },
            ]}
            onChange={(value) => {
              try {
                setLanguage(value);
                setError(false);
              } catch {
                setError(true);
              }
            }}
            chevron
          />
        </div>
        <form action={logout}>
          <LogoutButton />
        </form>
        {error && (
          <p role="alert" className="px-2 pt-2 text-xs text-red-400">
            {t("No se pudo guardar el idioma en este navegador.")}
          </p>
        )}
      </div>
    </header>
  );
}
