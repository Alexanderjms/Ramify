"use client";

import type { ReactNode } from "react";
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
  page?: "Dashboard" | "Metas";
  canvas?: boolean;
  goalId?: string;
}) {
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
      className="dashboard-shell dashboard-motion flex min-h-dvh bg-black text-white [color-scheme:dark] [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4 [&_button]:focus-visible:outline-white [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-white"
    >
      <Sidebar collapsed={false} page={page} goalId={goalId} />
      <div className="min-w-0 flex-1">
        <DashboardHeader collapsed={false} title={page} goalId={goalId} />
        <main
          className={
            canvas
              ? "flex min-w-0 flex-col"
              : "flex min-w-0 flex-col gap-7 px-3 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-6"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
