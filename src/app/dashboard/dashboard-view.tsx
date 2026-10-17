"use client";

import { useState, type ReactNode } from "react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";

export default function DashboardView({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-svh bg-black text-white [color-scheme:dark] [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4 [&_button]:focus-visible:outline-blue-400 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-blue-400">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="min-w-0 flex-1">
        <DashboardHeader collapsed={collapsed} />
        <main className="flex flex-col gap-7 px-5 pb-5 pt-6 sm:px-8 sm:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
