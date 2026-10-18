"use client";

import { useId, useRef } from "react";
import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";
import Icon from "@/components/icon";
import type { Goal } from "@/lib/goals";
import { useGoals } from "./goals-provider";
import NewGoalModal from "./new-goal-modal";
import DeleteGoalDialog from "./delete-goal-dialog";
import "./goal-card-menu.css";

export default function GoalCardMenu({ goal }: { goal: Goal }) {
  const { t } = useLanguage();
  const { updateGoal, deleteGoal } = useGoals();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const edit = useRef<HTMLDialogElement>(null);
  const deletion = useRef<HTMLDialogElement>(null);

  return (
    <>
      <TooltipButton
        ref={trigger}
        type="button"
        disabled={!goal.id}
        aria-label={`${t("Opciones de")} ${goal.name}`}
        aria-haspopup="menu"
        popoverTarget={id}
        className="relative z-20 flex min-h-9 min-w-9 cursor-pointer items-center justify-center p-1 text-zinc-400 sm:min-h-0 sm:min-w-0"
      >
        <Icon name="more" className="size-4" />
      </TooltipButton>
      <div
        id={id}
        popover="auto"
        role="menu"
        aria-label={`${t("Opciones de")} ${goal.name}`}
        className="goal-card-menu"
        onToggle={(event) => {
          if (event.newState !== "open") return;
          const element = event.currentTarget;
          const bounds = trigger.current?.getBoundingClientRect();
          if (!bounds) return;
          element.style.left = `${Math.max(8, Math.min(bounds.right - element.offsetWidth, window.innerWidth - element.offsetWidth - 8))}px`;
          element.style.top = `${Math.max(8, Math.min(bounds.bottom + 6, window.innerHeight - element.offsetHeight - 8))}px`;
          element
            .querySelector<HTMLButtonElement>("button")
            ?.focus({ preventScroll: true });
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.currentTarget.hidePopover();
            trigger.current?.focus({ preventScroll: true });
          }
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const buttons = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button",
            ),
          ];
          const current = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          buttons[
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : (current +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    buttons.length) %
                  buttons.length
          ]?.focus();
        }}
      >
        <button
          type="button"
          role="menuitem"
          popoverTarget={id}
          popoverTargetAction="hide"
          onClick={() => edit.current?.showModal()}
        >
          <i aria-hidden="true" className="bi bi-pencil" />
          {t("Editar meta")}
        </button>
        <button
          type="button"
          role="menuitem"
          className="goal-card-menu-delete"
          popoverTarget={id}
          popoverTargetAction="hide"
          onClick={() => deletion.current?.showModal()}
        >
          <i aria-hidden="true" className="bi bi-trash3" />
          {t("Eliminar meta")}
        </button>
      </div>
      <NewGoalModal
        dialogRef={edit}
        initialGoal={goal}
        onCreate={(changes) => {
          if (!goal.id) throw new Error("Goal not found");
          return updateGoal(goal.id, changes);
        }}
      />
      <DeleteGoalDialog
        dialogRef={deletion}
        name={goal.name}
        onDelete={() => {
          if (!goal.id) throw new Error("Goal not found");
          return deleteGoal(goal.id);
        }}
      />
    </>
  );
}
