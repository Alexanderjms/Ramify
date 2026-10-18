import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard/shell";
import GoalsView from "@/components/goals/goals-view";

export const metadata: Metadata = { title: "Metas · Ramify" };

export default function Goals() {
  return (
    <DashboardShell page="Metas">
      <GoalsView />
    </DashboardShell>
  );
}
