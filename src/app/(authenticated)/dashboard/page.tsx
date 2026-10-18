import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard/shell";
import DashboardOverview from "@/components/dashboard/overview";

export const metadata: Metadata = { title: "Dashboard · Ramify" };

export default function Dashboard() {
  return (
    <DashboardShell>
      <DashboardOverview />
    </DashboardShell>
  );
}
