"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import "@/components/ui-motion.css";
import { useLanguage } from "@/components/language-provider";
import "./mobile-sidebar.css";

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
  const menu = useRef<HTMLDialogElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useLanguage();
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) menu.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
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
      <dialog
        ref={menu}
        id="mobile-sidebar"
        aria-label={t("Navegación principal")}
        className="mobile-sidebar"
        onClose={() => setSidebarOpen(false)}
        onClick={(event) => {
          if ((event.target as Element).closest("a[href]"))
            menu.current?.close();
        }}
      >
        <Sidebar
          collapsed={false}
          page={page}
          goalId={goalId}
          mobile
          onClose={() => menu.current?.close()}
        />
      </dialog>
      <div className="min-w-0 flex-1">
        <DashboardHeader
          collapsed={false}
          title={page}
          goalId={goalId}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => {
            menu.current?.showModal();
            menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
            setSidebarOpen(true);
          }}
        />
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
