"use client";

import { goalIcons } from "@/lib/goal-icons";
import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import { useLanguage } from "@/components/language-provider";
import IconGrid from "./icon-grid";

export default function IconSearch({
  icon,
  color,
  query,
  onQueryChange,
  onIconChange,
  onClose,
}: {
  icon: string;
  color: string;
  query: string;
  onQueryChange: (query: string) => void;
  onIconChange: (icon: string) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const results = goalIcons.filter((name) =>
    name.includes(query.trim().toLowerCase().replaceAll(" ", "-")),
  );

  return (
    <>
      <label className="mb-4 flex items-center gap-2 rounded border border-zinc-800 px-3 focus-within:border-zinc-500">
        <Icon name="search" className="size-3.5 text-zinc-400" />
        <input
          type="search"
          autoFocus
          aria-label={t("Buscar iconos")}
          placeholder={t("Buscar iconos (star, book, heart…)")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-xs outline-none placeholder:text-zinc-500"
        />
      </label>
      <IconGrid
        key={query}
        results={results}
        icon={icon}
        color={color}
        onIconChange={onIconChange}
      />
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-zinc-800 pt-4">
        <p role="status" className="text-[11px] text-zinc-500">
          {results.length
            ? `${results.length} ${t("iconos")}`
            : t("No se encontraron iconos.")}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="paint-hover flex cursor-pointer rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium"
        >
          <PaintHover>{t("Listo")}</PaintHover>
        </button>
      </div>
    </>
  );
}
