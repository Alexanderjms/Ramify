"use client";

import { useEffect, type RefObject } from "react";
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
  onClose,
  syncStatus,
  syncPending,
  onRetrySync,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  activity?: GoalActivity;
  source: HTMLElement | null;
  onUpdate: (id: string, changes: GoalActivityChanges) => boolean;
  onClose?: () => void;
  syncStatus?: number;
  syncPending?: boolean;
  onRetrySync?: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    const panel = dialogRef.current;
    if (!panel || !activity?.id) return;
    let outside = false;
    function isOutside(target: EventTarget | null) {
      return (
        target instanceof Element &&
        !panel!.contains(target) &&
        !target.closest(
          "dialog[open], [popover]:popover-open, .goal-node-label, [data-sonner-toaster]",
        )
      );
    }
    function pointerDown(event: PointerEvent) {
      outside =
        event.button === 0 &&
        isOutside(event.target) &&
        !document.querySelector("dialog:modal");
    }
    function click(event: MouseEvent) {
      if (outside && panel?.open && isOutside(event.target)) panel.close();
      outside = false;
    }
    document.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("pointerdown", pointerDown, true);
      document.removeEventListener("click", click);
    };
  }, [activity?.id, dialogRef]);

  useEffect(() => {
    const panel = dialogRef.current;
    if (!panel || !activity?.id) return;
    source?.setAttribute("data-details-selected", "");
    source?.style.setProperty("--branch-color", activity.color);
    function clearSelection() {
      source?.removeAttribute("data-details-selected");
    }
    function escape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        panel?.open &&
        !event.defaultPrevented &&
        !document.querySelector("dialog:modal, [popover]:popover-open")
      )
        panel.close();
    }
    document.addEventListener("keydown", escape);
    panel.addEventListener("close", clearSelection);
    return () => {
      clearSelection();
      source?.style.removeProperty("--branch-color");
      document.removeEventListener("keydown", escape);
      panel.removeEventListener("close", clearSelection);
    };
  }, [dialogRef, source, activity?.id, activity?.color]);

  return (
    <div className="branch-details-layer">
      <dialog
        ref={dialogRef}
        onClose={async (event) => {
          const panel = event.currentTarget;
          await Promise.allSettled(
            panel.getAnimations().map((animation) => animation.finished),
          );
          if (!panel.open && panel.getAnimations().length === 0) onClose?.();
        }}
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
            syncStatus={syncStatus}
            syncPending={syncPending}
            onRetrySync={onRetrySync}
          />
        )}
      </dialog>
    </div>
  );
}
