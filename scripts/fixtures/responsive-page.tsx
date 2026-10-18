"use client";

import { usePathname } from "next/navigation";
import AuthSessionProvider from "@/components/auth-session-provider";
import DashboardShell from "@/components/dashboard/shell";
import DashboardOverview from "@/components/dashboard/overview";
import DashboardLoadingSkeleton from "@/components/dashboard/loading-skeleton";
import GoalsView from "@/components/goals/goals-view";
import GoalDetails from "@/components/goals/goal-details";

const session = {
  user: {
    id: "responsive-check",
    name: "Una cuenta con nombre bastante largo para revisar",
    email: "responsive@example.test",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

export default function ResponsiveCheckPage() {
  const screen = usePathname().split("/").at(-1);
  if (screen === "loading") return <DashboardLoadingSkeleton />;
  return (
    <AuthSessionProvider session={session}>
      <DashboardShell
        page={screen === "dashboard" ? "Dashboard" : "Metas"}
        canvas={screen === "diagrama"}
        goalId={screen === "diagrama" ? "responsive-goal" : undefined}
      >
        {screen === "dashboard" ? (
          <DashboardOverview />
        ) : screen === "diagrama" ? (
          <GoalDetails
            id="responsive-goal"
            initialView={{
              zoom: 1,
              scrollLeft: 0,
              scrollTop: 0,
              collapsed: [],
            }}
          />
        ) : (
          <GoalsView />
        )}
      </DashboardShell>
    </AuthSessionProvider>
  );
}
