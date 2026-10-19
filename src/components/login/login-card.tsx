"use client";

import { useLanguage } from "@/components/language-provider";
import { useEffect } from "react";
import Image from "next/image";
import type { Session } from "next-auth";
import Icon from "@/components/icon";
import "./github-button.css";
import { ErrorToast } from "@/components/app-feedback";

export default function LoginCard({
  session,
  error,
  action,
}: {
  session: Session | null;
  error?: string | string[];
  action: () => Promise<void>;
}) {
  const { t, language } = useLanguage();
  const pageTitle = `${t(session ? "Sesión iniciada" : "Iniciar sesión")} · Ramify`;
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);
  return (
    <div className="w-full max-w-[380px] rounded-2xl border border-white/15 bg-[#090b10]/50 px-5 py-8 text-center shadow-2xl backdrop-blur-xl sm:px-9 sm:py-10">
      <Image
        src="/icons/ramify-logo.png"
        alt={t("Logo de Ramify")}
        width={72}
        height={72}
        priority
        className="mx-auto mb-6"
      />
      <h1 className="text-3xl font-medium tracking-tight">
        {t(session ? "Sesión iniciada" : "Iniciar sesión")}
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {session
          ? `${language === "en" ? "Signed in as" : "Sesión iniciada como"} ${session.user?.name ?? "GitHub"}.`
          : t("Accede a Ramify con tu cuenta de GitHub.")}
      </p>
      <form className="mt-8" action={action}>
        <button
          type="submit"
          className="github-login-button relative flex min-h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-white bg-white px-4 py-3 text-sm font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <span className="flex items-center justify-center gap-3">
            <Icon name="github" className="size-5" />
            {t(session ? "Cerrar sesión" : "Continuar con GitHub")}
          </span>
          <span
            aria-hidden="true"
            className="github-login-ink absolute inset-0 flex items-center justify-center gap-3 bg-black text-white"
          >
            <Icon name="github" className="size-5" />
            {t(session ? "Cerrar sesión" : "Continuar con GitHub")}
          </span>
        </button>
      </form>
      <ErrorToast
        id="login-error"
        message={
          error
            ? error === "configuration"
              ? "Configura las credenciales de GitHub, AUTH_SECRET y la conexión de Turso en .env para activar el acceso."
              : "No se pudo iniciar sesión. Inténtalo de nuevo con GitHub."
            : undefined
        }
      />
    </div>
  );
}
