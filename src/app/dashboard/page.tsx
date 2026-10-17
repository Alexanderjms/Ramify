import type { Metadata } from "next";
import { Inter } from "next/font/google";
import DashboardView from "./dashboard-view";
import DashboardOverview from "@/components/dashboard/overview";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = { title: "Dashboard · Ramify" };

export default function Dashboard() {
  return (
    <div className={inter.className}>
      <DashboardView>
        <DashboardOverview />
      </DashboardView>
    </div>
  );
}
