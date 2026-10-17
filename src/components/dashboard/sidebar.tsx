import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/icon";

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={`sticky top-0 flex h-svh shrink-0 flex-col gap-6 border-r border-zinc-800 px-3 pb-3 sm:px-4 sm:pb-4 ${collapsed ? "w-[68px]" : "w-[68px] md:w-[252px]"}`}
      aria-label="Barra lateral"
    >
      <div className="-mx-3 flex h-14 shrink-0 items-center gap-2.5 border-b border-zinc-800 px-4 sm:-mx-4">
        <Image src="/Logo.svg" alt="" width={30} height={30} className="shrink-0" priority />
        {!collapsed && (
          <span className="hidden text-[22px] font-semibold tracking-[-0.8px] md:block">Ramify</span>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          aria-expanded={!collapsed}
          className={`${collapsed ? "absolute left-[76px] top-5 z-10 rounded border border-zinc-800 bg-black p-1" : "ml-auto hidden md:block"} cursor-pointer text-zinc-400 hover:text-white`}
        >
          <Icon name="panel" className="size-[15px]" />
        </button>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Navegación principal">
        <Link
          href="/dashboard"
          aria-current="page"
          title="Dashboard"
          className="flex items-center gap-2.5 rounded bg-zinc-900 px-2.5 py-[9px] text-[13px]"
        >
          <Icon name="dashboard" className="size-[17px] text-zinc-400" />
          {!collapsed && <span className="hidden md:inline">Dashboard</span>}
        </Link>
        <a
          href="#metas"
          title="Mis metas"
          className="flex items-center gap-2.5 rounded px-2.5 py-[9px] text-[13px] text-zinc-400 hover:bg-zinc-900 hover:text-white"
        >
          <Icon name="branch" />
          {!collapsed && <span className="hidden md:inline">Mis metas</span>}
        </a>
      </nav>

      <div className="flex-1" />
      <div className="border-t border-zinc-800" />
      <div className="flex items-center gap-2.5" aria-label="Perfil de Alex">
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded bg-zinc-900 text-[11px]">AL</div>
        {!collapsed && <span className="hidden min-w-0 flex-1 text-sm font-medium md:block">Alex</span>}
      </div>
    </aside>
  );
}
