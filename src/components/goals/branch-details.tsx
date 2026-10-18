"use client";

import { useEffect, useId, useRef, type RefObject } from "react";
import {
  type GoalActivity,
  type GoalActivityChanges,
} from "@/lib/goal-activities";
import BranchFields from "./branch-fields";
import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";
import "./branch-details.css";

export default function BranchDetails({
  dialogRef,
  activity,
  source,
  onUpdate,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  activity?: GoalActivity;
  source: HTMLElement | null;
  onUpdate: (id: string, changes: GoalActivityChanges) => boolean;
}) {
  const connector = useRef<SVGPathElement>(null);
  const { t, language } = useLanguage();
  const terminals = useRef<SVGGElement>(null);
  const startTerminal = useRef<SVGGElement>(null);
  const pinnedTask = useRef<HTMLButtonElement>(null);
  const connectionId = useId().replaceAll(":", "");

  useEffect(() => {
    const panel = dialogRef.current;
    const path = connector.current;
    const pin = pinnedTask.current;
    const canvas = source?.closest(".goal-canvas");
    if (!panel || !path || !source || !canvas) return;
    source.setAttribute("data-details-selected", "");
    source.style.setProperty("--branch-color", activity?.color ?? "#3B82F6");
    let frame = 0;
    let animateUntil = performance.now() + 300;
    let dockProgress = 0;
    let dockTarget = 0;
    let dockFrom = 0;
    let dockStarted = 0;

    function update() {
      frame = 0;
      if (!panel || !path || !source || !canvas) return;
      const origin = source.getBoundingClientRect();
      const view = canvas.getBoundingClientRect();
      const target = panel.getBoundingClientRect();
      const heading = panel.querySelector("h2")!.getBoundingClientRect();
      let x = origin.right + 16;
      let y = origin.top + origin.height / 2;
      const endX = target.left;
      const endY = heading.top + heading.height / 2;
      if (pin) {
        const left = view.left + 16;
        const right = Math.min(view.right, endX) - 48;
        const top = Math.max(view.top, 0) + 24;
        const bottom = Math.min(view.bottom, window.innerHeight) - 24;
        const outside =
          origin.top < view.top ||
          origin.bottom > view.bottom ||
          origin.left < view.left ||
          x >= right;
        const canPin =
          panel.open &&
          source.isConnected &&
          right - left >= 140 &&
          bottom > top;
        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const nextTarget = canPin && outside ? 1 : 0;
        const now = performance.now();
        if (nextTarget !== dockTarget) {
          dockFrom = dockProgress;
          dockTarget = nextTarget;
          dockStarted = now;
        }
        const elapsed = Math.min(1, (now - dockStarted) / 280);
        const eased = elapsed * elapsed * (3 - 2 * elapsed);
        dockProgress =
          reducedMotion || !canPin
            ? nextTarget
            : dockFrom + (dockTarget - dockFrom) * eased;
        pin.hidden = !canPin || dockProgress === 0;
        if (!pin.hidden) {
          pin.style.maxWidth = `${Math.min(240, right - left)}px`;
          pin.style.width = "auto";
          const dockWidth = pin.offsetWidth;
          pin.style.width = `${origin.width + (dockWidth - origin.width) * dockProgress}px`;
          const dockX = right - pin.offsetWidth;
          const fromX = Math.max(left, Math.min(origin.left, dockX));
          const centerY = Math.max(top, Math.min(y, bottom));
          const pinX = fromX + (dockX - fromX) * dockProgress;
          pin.style.left = "0px";
          pin.style.top = "0px";
          pin.style.transform = `translate(${pinX}px,${centerY - pin.offsetHeight / 2}px)`;
          pin.style.opacity = String(dockProgress);
          x = pinX + pin.offsetWidth + 16;
          y = centerY;
        }
        if (dockProgress !== dockTarget) animateUntil = now + 32;
      }
      const visible =
        source.isConnected &&
        y >= view.top &&
        y <= view.bottom &&
        x > view.left &&
        x < Math.min(view.right, endX - 24);
      path.style.visibility = visible ? "visible" : "hidden";
      if (terminals.current)
        terminals.current.style.visibility = visible ? "visible" : "hidden";
      if (visible) {
        const distance = endX - x;
        path.setAttribute(
          "d",
          `M${x} ${y} C${x + distance * 0.45} ${y},${endX - distance * 0.45} ${endY},${endX} ${endY}`,
        );
        startTerminal.current?.setAttribute(
          "transform",
          `translate(${x},${y})`,
        );
      }
      if (performance.now() < animateUntil)
        frame = requestAnimationFrame(update);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    function animate() {
      source?.toggleAttribute("data-details-selected", panel?.open ?? false);
      animateUntil = performance.now() + 300;
      schedule();
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && panel?.open && !event.defaultPrevented)
        panel.close();
    }
    const resize = new ResizeObserver(schedule);
    resize.observe(source);
    resize.observe(canvas);
    resize.observe(panel);
    resize.observe(panel.querySelector("h2")!);
    const changes = new MutationObserver(schedule);
    changes.observe(canvas, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["style"],
    });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    document.addEventListener("keydown", escape);
    panel.addEventListener("close", animate);
    panel.addEventListener("transitionrun", animate);
    canvas.addEventListener("transitionrun", animate);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      if (pin) pin.hidden = true;
      resize.disconnect();
      changes.disconnect();
      source.removeAttribute("data-details-selected");
      source.style.removeProperty("--branch-color");
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("keydown", escape);
      panel.removeEventListener("close", animate);
      panel.removeEventListener("transitionrun", animate);
      canvas.removeEventListener("transitionrun", animate);
    };
  }, [dialogRef, source, activity?.id, activity?.color]);

  return (
    <div className="branch-details-layer">
      <svg
        className="branch-details-connector"
        aria-hidden="true"
        style={{ color: activity?.color ?? "#3B82F6" }}
      >
        <defs>
          <path id={`${connectionId}-path`} ref={connector} pathLength="1" />
          <linearGradient
            id={`${connectionId}-light`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="currentColor" />
            <stop offset="65%" stopColor="currentColor" />
            <stop offset="100%" stopColor="#E4E4E7" />
          </linearGradient>
        </defs>
        <use
          href={`#${connectionId}-path`}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="branch-cable-halo"
        />
        <use
          href={`#${connectionId}-path`}
          fill="none"
          stroke={`url(#${connectionId}-light)`}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g ref={terminals}>
          <g ref={startTerminal}>
            <circle
              r="7"
              fill="#09090B"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle r="2.5" fill="currentColor" />
          </g>
        </g>
      </svg>
      <TooltipButton
        ref={pinnedTask}
        hidden
        type="button"
        className="branch-pinned-task"
        style={{ borderColor: activity?.color }}
        aria-label={
          language === "en"
            ? `Return to task ${activity?.name ?? "selected"}`
            : `Volver a la tarea ${activity?.name ?? "seleccionada"}`
        }
        title={t("Volver a la tarea en el diagrama")}
        onClick={() => {
          source?.scrollIntoView({
            block: "center",
            inline: "center",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
          });
          source
            ?.querySelector<HTMLButtonElement>(".goal-node-title")
            ?.focus({ preventScroll: true });
        }}
      >
        <i
          aria-hidden="true"
          className="bi bi-pin-angle-fill"
          style={{ color: activity?.color }}
        />
        <span>{activity?.name}</span>
        <i aria-hidden="true" className="bi bi-arrow-return-left" />
      </TooltipButton>
      <dialog
        ref={dialogRef}
        aria-labelledby="branch-details-title"
        className="branch-details app-scrollbar"
      >
        <header className="branch-details-header">
          <span>{t("Detalles de actividad")}</span>
          <TooltipButton
            type="button"
            autoFocus
            aria-label={t("Cerrar detalles de la meta")}
            onClick={() => dialogRef.current?.close()}
            className="branch-details-close"
          >
            <i aria-hidden="true" className="bi bi-x-lg" />
          </TooltipButton>
        </header>
        {activity && (
          <BranchFields
            key={activity.id}
            activity={activity}
            onUpdate={onUpdate}
          />
        )}
      </dialog>
    </div>
  );
}
