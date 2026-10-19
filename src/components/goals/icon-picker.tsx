"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import GoalSymbol from "./goal-symbol";
import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";
import IconColorPalette from "./icon-color-palette";
import IconSearch from "./icon-search";
import { GOAL_COLORS_PER_PAGE, goalColors } from "./goal-colors";

const colorPages = Math.ceil(goalColors.length / GOAL_COLORS_PER_PAGE);

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
  const [open, setOpen] = useState(false);
  const [colorPage, setColorPage] = useState(0);
  const { t } = useLanguage();
  const palette = useRef<HTMLDivElement>(null);
  const paletteAnimation = useRef<Animation | null>(null);
  const pendingPage = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
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
              goalColors.findIndex(([, value]) => value === color) /
                GOAL_COLORS_PER_PAGE,
            ),
          );
          setColorPage(pendingPage.current);
          flushSync(() => setOpen(true));
          dialog.current?.showModal();
          dialog.current?.querySelector("input")?.focus();
        }}
        className="paint-hover flex min-h-10 cursor-pointer items-center gap-3 rounded border border-zinc-800 bg-black px-3 py-2 text-xs"
      >
        <PaintHover>
          <GoalSymbol goal={{ icon, color }} />
          <span>{t("Cambiar icono y color")}</span>
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
          setOpen(false);
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
        className="new-goal-modal icon-picker-modal app-scrollbar fixed m-auto max-h-[calc(100svh-24px)] w-[calc(100%-24px)] max-w-[500px] overflow-x-hidden overflow-y-auto rounded-lg border border-zinc-800 bg-black p-4 text-white [color-scheme:dark] sm:max-h-[calc(100svh-32px)] sm:w-[calc(100%-32px)] sm:p-7"
      >
        {open && (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2
                id={`${id}-title`}
                className="text-lg font-semibold tracking-[-0.4px]"
              >
                {t("Icono y color")}
              </h2>
              <TooltipButton
                type="button"
                aria-label={t("Cerrar selector de iconos")}
                onClick={() => dialog.current?.close()}
                className="paint-hover flex cursor-pointer rounded p-1 text-zinc-400"
              >
                <PaintHover>
                  <i
                    aria-hidden="true"
                    className="bi bi-x-lg text-sm leading-none"
                  />
                </PaintHover>
              </TooltipButton>
            </div>
            <IconColorPalette
              color={color}
              colorPage={colorPage}
              paletteRef={palette}
              onColorChange={onColorChange}
              onPageChange={changeColorPage}
            />
            <IconSearch
              icon={icon}
              color={color}
              query={query}
              onQueryChange={setQuery}
              onIconChange={onIconChange}
              onClose={() => dialog.current?.close()}
            />
          </>
        )}
      </dialog>
    </div>
  );
}
