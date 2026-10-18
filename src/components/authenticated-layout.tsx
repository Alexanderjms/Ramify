import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import AuthSessionProvider from "./auth-session-provider";
import DashboardLoadingSkeleton from "@/components/dashboard/loading-skeleton";

async function AuthenticatedContent({ children }: { children: ReactNode }) {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <AuthSessionProvider session={session}>{children}</AuthSessionProvider>
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
