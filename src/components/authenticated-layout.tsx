import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import AuthSessionProvider from "./auth-session-provider";
import DashboardLoadingSkeleton from "@/components/dashboard/loading-skeleton";
import { getDatabase } from "@/lib/db";
import { loadUserPreferences } from "@/lib/preference-database";

async function AuthenticatedContent({ children }: { children: ReactNode }) {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const preferences = await loadUserPreferences(getDatabase(), session.user.id);
  return (
    <AuthSessionProvider session={session} initialPreferences={preferences}>
      {children}
    </AuthSessionProvider>
  );
}

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <AuthenticatedContent>{children}</AuthenticatedContent>
    </Suspense>
  );
}
