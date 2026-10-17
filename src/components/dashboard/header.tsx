import Icon from "@/components/icon";

export default function DashboardHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-zinc-800 px-5 sm:px-8">
      <nav
        aria-label="Ruta de navegación"
        className={`flex items-center gap-[9px] text-xs ${collapsed ? "pl-5" : ""}`}
      >
        <span className="text-zinc-400">Mi espacio</span>
        <Icon name="chevron" className="size-3 text-zinc-400" />
        <span>Dashboard</span>
      </nav>
      <div className="flex items-center gap-4 text-zinc-400">
        <button type="button" disabled aria-label="Buscar (próximamente)" title="Buscar: próximamente" className="hidden sm:block">
          <Icon name="search" className="size-4" />
        </button>
        <button type="button" disabled aria-label="Cambiar apariencia (próximamente)" title="Apariencia: próximamente">
          <Icon name="sun" className="size-4" />
        </button>
        <span className="text-[10px]">Demo</span>
      </div>
    </header>
  );
}
