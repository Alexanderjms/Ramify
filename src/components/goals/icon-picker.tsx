"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import bootstrapIcons from "bootstrap-icons/font/bootstrap-icons.json";
import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import GoalSymbol from "./goal-symbol";

const icons = Object.keys(bootstrapIcons)
  .filter((name) => name.endsWith("-fill"))
  .sort();
const colors = [
  ["Blanco", "#FFFFFF"],
  ["Azul", "#3B82F6"],
  ["Violeta", "#A78BFA"],
  ["Verde", "#22C55E"],
  ["Naranja", "#F59E0B"],
  ["Gris", "#94A3B8"],
  ["Rosa", "#EC4899"],
  ["Rojo", "#EF4444"],
  ["Cian", "#06B6D4"],
  ["Amarillo", "#FACC15"],
  ["Coral", "#FB7185"],
  ["Turquesa", "#2DD4BF"],
  ["Lavanda", "#C4B5FD"],
  ["Lima", "#A3E635"],
  ["Azul cielo", "#38BDF8"],
  ["Fucsia", "#D946EF"],
  ["Esmeralda", "#10B981"],
  ["Índigo", "#6366F1"],
  ["Mandarina", "#F97316"],
  ["Plata", "#CBD5E1"],
  ["Rojo claro", "#FCA5A5"],
  ["Azul claro", "#93C5FD"],
  ["Verde claro", "#86EFAC"],
  ["Rosa claro", "#F9A8D4"],
  ["Melocotón", "#FDBA74"],
  ["Menta", "#99F6E4"],
  ["Lila", "#D8B4FE"],
  ["Amarillo claro", "#FDE68A"],
  ["Cian claro", "#A5F3FC"],
  ["Marfil", "#FEF3C7"],
  ["Granate", "#BE123C"],
  ["Azul oscuro", "#1D4ED8"],
  ["Verde oscuro", "#15803D"],
  ["Morado", "#9333EA"],
  ["Ámbar oscuro", "#B45309"],
  ["Petróleo", "#0F766E"],
  ["Rosa oscuro", "#BE185D"],
  ["Pizarra", "#64748B"],
  ["Grafito", "#52525B"],
  ["Cobre", "#C2410C"],
  ["Salmón", "#FDA4AF"],
  ["Frambuesa", "#DB2777"],
  ["Berenjena", "#7E22CE"],
  ["Azul real", "#2563EB"],
  ["Celeste suave", "#7DD3FC"],
  ["Aguamarina", "#5EEAD4"],
  ["Jade", "#34D399"],
  ["Pistacho", "#BEF264"],
  ["Oro", "#EAB308"],
  ["Arena", "#D6C3A5"],
  ["Terracota", "#EA580C"],
  ["Chocolate", "#92400E"],
  ["Malva", "#E879F9"],
  ["Acero", "#475569"],
];
const colorsPerPage = 9;
const colorPages = Math.ceil(colors.length / colorsPerPage);

export default function IconPicker({
  icon,
  color,
  onIconChange,
  onColorChange,
}: {
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [colorPage, setColorPage] = useState(0);
  const palette = useRef<HTMLDivElement>(null);
  const paletteAnimation = useRef<Animation | null>(null);
  const pendingPage = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const results = icons.filter((name) =>
    name.includes(query.trim().toLowerCase().replaceAll(" ", "-")),
  );

  useEffect(() => () => paletteAnimation.current?.cancel(), []);

  async function changeColorPage(
    step: number,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    const nextPage = Math.max(
      0,
      Math.min(colorPages - 1, pendingPage.current + step),
    );
    pendingPage.current = nextPage;
    const element = palette.current;
    if (
      !element?.animate ||
      event.detail === 0 ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      paletteAnimation.current?.cancel();
      setColorPage(nextPage);
      return;
    }
    const current = getComputedStyle(element);
    const start = { opacity: current.opacity, transform: current.transform };
    const easing = getComputedStyle(element)
      .getPropertyValue("--ease-out")
      .trim();
    paletteAnimation.current?.cancel();
    const exit = element.animate(
      [
        start,
        { opacity: 0, transform: `translateX(${step > 0 ? -12 : 12}px)` },
      ],
      { duration: 100, easing, fill: "forwards" },
    );
    paletteAnimation.current = exit;
    try {
      await exit.finished;
    } catch {
      return;
    }
    flushSync(() => setColorPage(nextPage));
    exit.cancel();
    paletteAnimation.current = element.animate(
      [
        { opacity: 0, transform: `translateX(${step > 0 ? 12 : -12}px)` },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 160, easing },
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-controls={id}
        onClick={() => {
          setQuery("");
          paletteAnimation.current?.cancel();
          pendingPage.current = Math.max(
            0,
            Math.floor(
              colors.findIndex(([, value]) => value === color) / colorsPerPage,
            ),
          );
          setColorPage(pendingPage.current);
          dialog.current?.showModal();
        }}
        className="paint-hover flex min-h-10 cursor-pointer items-center gap-3 rounded border border-zinc-800 bg-black px-3 py-2 text-xs"
      >
        <PaintHover>
          <GoalSymbol goal={{ icon, color }} />
          <span>Cambiar icono y color</span>
          <Icon name="down" className="size-3 text-zinc-400" />
        </PaintHover>
      </button>
      <dialog
        ref={dialog}
        id={id}
        aria-labelledby={`${id}-title`}
        onCancel={(event) => event.stopPropagation()}
        onClose={(event) => {
          event.stopPropagation();
          paletteAnimation.current?.cancel();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            event.currentTarget.close();
        }}
        className="new-goal-modal icon-picker-modal app-scrollbar fixed m-auto max-h-[calc(100svh-32px)] w-[calc(100%-32px)] max-w-[500px] overflow-y-auto rounded-lg border border-zinc-800 bg-black p-6 text-white [color-scheme:dark] sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2
            id={`${id}-title`}
            className="text-lg font-semibold tracking-[-0.4px]"
          >
            Icono y color
          </h2>
          <button
            type="button"
            aria-label="Cerrar selector de iconos"
            onClick={() => dialog.current?.close()}
            className="paint-hover flex cursor-pointer rounded p-1 text-zinc-400"
          >
            <PaintHover>
              <i
                aria-hidden="true"
                className="bi bi-x-lg text-sm leading-none"
              />
            </PaintHover>
          </button>
        </div>
        <div
          role="group"
          aria-label="Color del icono"
          className="mb-3 flex w-full items-center justify-between gap-1"
        >
          <button
            type="button"
            aria-label="Colores anteriores"
            disabled={colorPage === 0}
            onClick={(event) => changeColorPage(-1, event)}
            className="paint-hover flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-zinc-400 disabled:cursor-default disabled:opacity-25 sm:size-7"
          >
            <PaintHover>
              <Icon name="chevron" className="size-3 rotate-180" />
            </PaintHover>
          </button>
          <div
            ref={palette}
            className="color-page flex min-w-0 flex-1 justify-between gap-0.5 sm:gap-1"
          >
            {colors
              .slice(colorPage * colorsPerPage, (colorPage + 1) * colorsPerPage)
              .map(([label, value]) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  title={label}
                  aria-pressed={color === value}
                  onClick={() => onColorChange(value)}
                  className={`paint-hover flex aspect-square w-full min-w-0 max-w-7 cursor-pointer items-center justify-center rounded border ${color === value ? "border-zinc-500 bg-zinc-800" : "border-transparent"}`}
                >
                  <span
                    className="flex size-4 max-w-full items-center justify-center rounded-full sm:size-5"
                    style={{ backgroundColor: value }}
                  >
                    {color === value && (
                      <Icon
                        name="tick"
                        className={`size-3 ${value === "#FFFFFF" ? "text-black" : "text-white"}`}
                      />
                    )}
                  </span>
                </button>
              ))}
          </div>
          <button
            type="button"
            aria-label="Colores siguientes"
            disabled={colorPage === colorPages - 1}
            onClick={(event) => changeColorPage(1, event)}
            className="paint-hover flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-zinc-400 disabled:cursor-default disabled:opacity-25 sm:size-7"
          >
            <PaintHover>
              <Icon name="chevron" className="size-3" />
            </PaintHover>
          </button>
          <span aria-live="polite" className="sr-only">
            Paleta {colorPage + 1} de {colorPages}
          </span>
        </div>
        <label className="mb-4 flex items-center gap-2 rounded border border-zinc-800 px-3 focus-within:border-zinc-500">
          <Icon name="search" className="size-3.5 text-zinc-400" />
          <input
            type="search"
            autoFocus
            aria-label="Buscar iconos"
            placeholder="Buscar iconos (star, book, heart…)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-xs outline-none placeholder:text-zinc-500"
          />
        </label>
        <div
          role="group"
          aria-label="Iconos Bootstrap Fill"
          className="app-scrollbar grid max-h-[min(320px,40svh)] grid-cols-6 gap-1.5 overflow-y-auto overscroll-contain p-1 pr-2 sm:grid-cols-9"
        >
          {results.map((name) => (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={name}
              aria-pressed={icon === name}
              onClick={() => onIconChange(name)}
              className={`paint-hover flex size-9 cursor-pointer items-center justify-center rounded border ${icon === name ? "border-zinc-500 bg-zinc-800" : "border-transparent"}`}
            >
              <PaintHover>
                <i
                  aria-hidden="true"
                  className={`bi bi-${name} text-lg leading-none`}
                  style={{ color }}
                />
              </PaintHover>
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-zinc-800 pt-4">
          <p role="status" className="text-[11px] text-zinc-500">
            {results.length
              ? `${results.length} iconos`
              : "No se encontraron iconos."}
          </p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="paint-hover flex cursor-pointer rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium"
          >
            <PaintHover>Listo</PaintHover>
          </button>
        </div>
      </dialog>
    </div>
  );
}
