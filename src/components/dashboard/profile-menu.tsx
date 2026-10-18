"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { logout } from "@/app/account-actions";
import PaintHover from "@/components/paint-hover";
import Select from "@/components/select";
import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";
import { useSession } from "next-auth/react";

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

export default function ProfileMenu() {
  const { language, setLanguage, t } = useLanguage();
  const { data: session } = useSession();
  const name =
    session?.user?.name ||
    session?.user?.email ||
    (language === "en" ? "My account" : "Mi cuenta");
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();
  const profileLabel = `${language === "en" ? "Profile of" : "Perfil de"} ${name}`;
  const menuId = useId();
  const [error, setError] = useState(false);

  return (
    <>
      <TooltipButton
        type="button"
        popoverTarget={menuId}
        aria-haspopup="dialog"
        className="profile-trigger paint-hover flex shrink-0 cursor-pointer items-center gap-2.5 rounded p-1 text-white"
        aria-label={profileLabel}
        title={name}
      >
        <PaintHover>
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded bg-zinc-900 text-[11px]">
            {initials}
          </span>
          <span className="hidden max-w-36 truncate text-sm font-medium sm:block">
            {name}
          </span>
          <i
            aria-hidden="true"
            className="bi bi-chevron-down text-[10px] text-zinc-400"
          />
        </PaintHover>
      </TooltipButton>
      <div
        id={menuId}
        popover="auto"
        role="dialog"
        aria-label={profileLabel}
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
    </>
  );
}
