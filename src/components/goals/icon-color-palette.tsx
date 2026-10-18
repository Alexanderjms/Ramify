import type { MouseEvent, RefObject } from "react";
import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import { useLanguage } from "@/components/language-provider";
import { GOAL_COLORS_PER_PAGE, goalColors } from "./goal-colors";

const colorPages = Math.ceil(goalColors.length / GOAL_COLORS_PER_PAGE);

export default function IconColorPalette({
  color,
  colorPage,
  paletteRef,
  onColorChange,
  onPageChange,
}: {
  color: string;
  colorPage: number;
  paletteRef: RefObject<HTMLDivElement | null>;
  onColorChange: (color: string) => void;
  onPageChange: (step: number, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("Color del icono")}
      className="mb-3 flex w-full items-center justify-between gap-1"
    >
      <button
        type="button"
        aria-label={t("Colores anteriores")}
        disabled={colorPage === 0}
        onClick={(event) => onPageChange(-1, event)}
        className="paint-hover flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-zinc-400 disabled:cursor-default disabled:opacity-25 sm:size-7"
      >
        <PaintHover>
          <Icon name="chevron" className="size-3 rotate-180" />
        </PaintHover>
      </button>
      <div
        ref={paletteRef}
        className="color-page flex min-w-0 flex-1 justify-between gap-0.5 sm:gap-1"
      >
        {goalColors
          .slice(
            colorPage * GOAL_COLORS_PER_PAGE,
            (colorPage + 1) * GOAL_COLORS_PER_PAGE,
          )
          .map(([label, value]) => (
            <button
              key={value}
              type="button"
              aria-label={t(label)}
              title={t(label)}
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
        aria-label={t("Colores siguientes")}
        disabled={colorPage === colorPages - 1}
        onClick={(event) => onPageChange(1, event)}
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
  );
}
