"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import PaintHover from "@/components/paint-hover";
import { TooltipButton } from "@/components/tooltip";
import { useLanguage } from "@/components/language-provider";

const rowHeight = 42;

export default function IconGrid({
  results,
  icon,
  color,
  onIconChange,
}: {
  results: string[];
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
}) {
  const { t } = useLanguage();
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ columns: 6, height: 320 });
  const [scrollTop, setScrollTop] = useState(0);
  useEffect(() => {
    const element = viewport.current!;
    const observer = new ResizeObserver(() => {
      const columns = Number(
        getComputedStyle(element).getPropertyValue("--icon-columns"),
      );
      setSize((previous) =>
        previous.columns === columns && previous.height === element.clientHeight
          ? previous
          : { columns, height: element.clientHeight },
      );
      setScrollTop(element.scrollTop);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const rows = Math.ceil(results.length / size.columns);
  const firstRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const lastRow = Math.min(
    rows,
    Math.ceil((scrollTop + size.height) / rowHeight) + 2,
  );
  const start = firstRow * size.columns;

  return (
    <div
      ref={viewport}
      role="group"
      aria-label={t("Iconos Bootstrap")}
      className="app-scrollbar max-h-[min(320px,40svh)] overflow-y-auto overscroll-contain p-1 pr-2 [--icon-columns:6] sm:[--icon-columns:9]"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      onKeyDown={(event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
          "button[data-icon-index]",
        );
        if (!button) return;
        const index = Number(button.dataset.iconIndex);
        let next = index;
        switch (event.key) {
          case "ArrowRight":
            next++;
            break;
          case "ArrowLeft":
            next--;
            break;
          case "ArrowDown":
            next += size.columns;
            break;
          case "ArrowUp":
            next -= size.columns;
            break;
          case "Home":
            next = 0;
            break;
          case "End":
            next = results.length - 1;
            break;
          case "Tab":
            next += event.shiftKey ? -1 : 1;
            if (next < 0 || next >= results.length) return;
            break;
          default:
            return;
        }
        event.preventDefault();
        next = Math.max(0, Math.min(results.length - 1, next));
        const element = event.currentTarget;
        const top = Math.floor(next / size.columns) * rowHeight;
        if (top < element.scrollTop) element.scrollTop = top;
        else if (top + rowHeight > element.scrollTop + element.clientHeight)
          element.scrollTop = top + rowHeight - element.clientHeight + 8;
        flushSync(() => setScrollTop(element.scrollTop));
        element
          .querySelector<HTMLButtonElement>(`[data-icon-index="${next}"]`)
          ?.focus({ preventScroll: true });
      }}
    >
      <div
        className="relative"
        style={{ height: Math.max(0, rows * rowHeight - 6) }}
      >
        <div
          className="absolute inset-x-0 grid grid-cols-6 gap-1.5 sm:grid-cols-9"
          style={{ top: firstRow * rowHeight }}
        >
          {results.slice(start, lastRow * size.columns).map((name, offset) => (
            <TooltipButton
              key={name}
              type="button"
              title={name}
              aria-label={name}
              aria-pressed={icon === name}
              data-icon-index={start + offset}
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
            </TooltipButton>
          ))}
        </div>
      </div>
    </div>
  );
}
