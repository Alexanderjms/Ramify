import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDatabase } from "@/lib/db";
import { loadGoalView } from "@/lib/goal-view";
import DashboardShell from "@/components/dashboard/shell";
import GoalDetails from "@/components/goals/goal-details";

export const metadata: Metadata = { title: "Meta · Ramify" };

async function GoalContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const initialView = await loadGoalView(getDatabase(), session.user.id, id);
  return (
    <DashboardShell page="Metas" canvas goalId={id}>
      <GoalDetails key={id} id={id} initialView={initialView} />
    </DashboardShell>
  );
}

export default function GoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <DashboardShell page="Metas" canvas>
          <p className="p-8 text-xs text-zinc-400">Cargando meta…</p>
        </DashboardShell>
      }
    >
      <GoalContent params={params} />
    </Suspense>
  );
}
