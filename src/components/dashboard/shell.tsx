"use client";

import { useState, type ReactNode } from "react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import "@/components/ui-motion.css";

export default function DashboardShell({
  children,
  page = "Dashboard",
  canvas = false,
  goalId,
}: {
  children: ReactNode;
  page?: "Dashboard" | "Goals";
  canvas?: boolean;
  goalId?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      onKeyDownCapture={(event) => {
        event.currentTarget.dataset.motion = "instant";
      }}
      onPointerDownCapture={(event) => {
        delete event.currentTarget.dataset.motion;
      }}
      onPointerMoveCapture={(event) => {
        delete event.currentTarget.dataset.motion;
      }}
      className="dashboard-motion flex min-h-svh bg-black text-white [color-scheme:dark] [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4 [&_button]:focus-visible:outline-white [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-white"
    >
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        page={page}
        goalId={goalId}
      />
      <div className="min-w-0 flex-1">
        <DashboardHeader collapsed={collapsed} title={page} goalId={goalId} />
        <main
          className={
            canvas
              ? "flex min-w-0 flex-col"
              : "flex flex-col gap-7 px-5 pb-5 pt-6 sm:px-8 sm:pb-8"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
