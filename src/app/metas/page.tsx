import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard/shell";
import GoalsView from "@/components/goals/goals-view";

export const metadata: Metadata = { title: "Goals · Ramify" };

export default function Goals() {
  return (
    <DashboardShell page="Goals">
      <GoalsView />
    </DashboardShell>
  );
}
