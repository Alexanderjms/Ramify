import type { Metadata } from "next";
import { Suspense } from "react";
import DashboardShell from "@/components/dashboard/shell";
import GoalDetails from "@/components/goals/goal-details";

export const metadata: Metadata = { title: "Meta · Ramify" };

async function GoalContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <DashboardShell page="Goals" canvas goalId={id}>
      <GoalDetails id={id} />
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
        <DashboardShell page="Goals" canvas>
          <p className="p-8 text-xs text-zinc-400">Cargando meta…</p>
        </DashboardShell>
      }
    >
      <GoalContent params={params} />
    </Suspense>
  );
}
