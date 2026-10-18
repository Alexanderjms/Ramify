"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/components/language-provider";
import type { GoalActivity } from "@/lib/goal-activities";

export type DiagramContext = {
  x: number;
  y: number;
  activity?: GoalActivity;
  source: HTMLElement;
};

export default function GoalContextMenu({
  context,
  onClose,
  onCreate,
  onEdit,
  onDelete,
  onReset,
  onFit,
}: {
  context: DiagramContext | null;
  onClose: () => void;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReset: () => void;
  onFit: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const element = menu.current;
    if (!context || !element) return;
    element.showPopover();
    const bounds = element.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(context.x, window.innerWidth - bounds.width - 8))}px`;
    element.style.top = `${Math.max(8, Math.min(context.y, window.innerHeight - bounds.height - 8))}px`;
    element
      .querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
    const dismiss = () => element.hidePopover();
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [context]);

  function run(action: () => void) {
    menu.current?.hidePopover();
    action();
  }

  return (
    <div
      ref={menu}
      popover="auto"
      role="menu"
      aria-label={t(
        context?.activity ? "Opciones de la rama" : "Opciones del diagrama",
      )}
      className="goal-settings-menu goal-context-menu"
      onToggle={(event) => {
        if (event.newState === "closed") onClose();
      }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Tab") {
          event.preventDefault();
          event.stopPropagation();
          menu.current?.hidePopover();
          const source = context?.source;
          (
            source?.querySelector<HTMLButtonElement>(".goal-node-title") ??
            source
          )?.focus({ preventScroll: true });
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
        ];
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  buttons.length) %
                buttons.length;
        buttons[next]?.focus();
      }}
    >
      {context?.activity ? (
        <>
          <p className="truncate px-3 py-2 text-[11px] text-zinc-400">
            {context.activity.name}
          </p>
          <button type="button" role="menuitem" onClick={() => run(onEdit)}>
            <i aria-hidden="true" className="bi bi-pencil" />
            {t("Editar")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="goal-delete-action"
            onClick={() => run(onDelete)}
          >
            <i aria-hidden="true" className="bi bi-trash3" />
            {t("Eliminar")}
          </button>
        </>
      ) : (
        <>
          <button type="button" role="menuitem" onClick={() => run(onCreate)}>
            <i aria-hidden="true" className="bi bi-plus-lg" />
            {t("Nueva meta")}
          </button>
          <button type="button" role="menuitem" onClick={() => run(onReset)}>
            <i aria-hidden="true" className="bi bi-crosshair" />
            {t("Centrar lienzo")}
          </button>
          <button type="button" role="menuitem" onClick={() => run(onFit)}>
            <i aria-hidden="true" className="bi bi-fullscreen" />
            {t("Ajustar a pantalla")}
          </button>
        </>
      )}
    </div>
  );
}
