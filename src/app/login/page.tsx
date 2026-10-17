import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import GradientASCII from "@/components/GradientASCII";
import LoginCard from "@/components/login/login-card";

export const metadata: Metadata = { title: "Iniciar sesión · Ramify" };

export default function Login(props: PageProps<"/login">) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center bg-[#050609] text-zinc-400" aria-label="Cargando inicio de sesión">
          Cargando…
        </main>
      }
    >
      <LoginContent {...props} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const configured = Boolean(
    process.env.AUTH_GITHUB_ID &&
      process.env.AUTH_GITHUB_SECRET &&
      process.env.AUTH_SECRET,
  );
  const session = configured ? await auth() : null;

  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-[#050609] text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[#050609]" aria-hidden="true">
        <GradientASCII fontFamily="monospace" />
        <div className="absolute inset-0 bg-black/30" />
      </div>
      <section className="flex flex-1 items-center justify-center px-6 py-16">
        <LoginCard
          session={session}
          error={error}
          action={async () => {
            "use server";
            if (session) {
              await signOut({ redirectTo: "/login" });
              return;
            }
            if (!configured) redirect("/login?error=configuration");
            await signIn("github", { redirectTo: "/login" });
          }}
        />
      </section>
    </main>
  );
}
