import Image from "next/image";
import type { Session } from "next-auth";
import Icon from "@/components/icon";

export default function LoginCard({
  session,
  error,
  action,
}: {
  session: Session | null;
  error?: string | string[];
  action: () => Promise<void>;
}) {
  return (
    <div className="w-full max-w-[380px] rounded-2xl border border-white/15 bg-[#090b10]/50 px-7 py-10 text-center shadow-2xl backdrop-blur-xl sm:px-9">
      <Image
        src="/Logo.svg"
        alt="Logo de Ramify"
        width={72}
        height={72}
        priority
        className="mx-auto mb-6"
      />
      <h1 className="text-3xl font-medium tracking-tight">
        {session ? "Sesión iniciada" : "Iniciar sesión"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {session
          ? `Sesión iniciada como ${session.user?.name ?? "usuario de GitHub"}.`
          : "Accede a Ramify con tu cuenta de GitHub."}
      </p>
      <form className="mt-8" action={action}>
        <button
          type="submit"
          className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
        >
          <Icon name="github" className="size-5" />
          {session ? "Cerrar sesión" : "Continuar con GitHub"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm leading-5 text-amber-200">
          {error === "configuration"
            ? "Completa AUTH_GITHUB_ID, AUTH_GITHUB_SECRET y AUTH_SECRET en .env para activar el acceso."
            : "No se pudo iniciar sesión. Inténtalo de nuevo con GitHub."}
        </p>
      )}
    </div>
  );
}
