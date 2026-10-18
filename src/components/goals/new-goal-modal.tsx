"use client";

import { useId, useRef, useState, type RefObject } from "react";
import type { Goal } from "@/lib/goals";
import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import IconPicker from "./icon-picker";
import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";
import "./new-goal-modal.css";

export default function NewGoalModal({
  dialogRef,
  onCreate,
  initialGoal,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onCreate: (
    goal: Pick<Goal, "name" | "description" | "icon" | "color">,
  ) => void;
  initialGoal?: Pick<Goal, "name" | "description" | "icon" | "color">;
}) {
  const form = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const { t } = useLanguage();
  const [icon, setIcon] = useState(initialGoal?.icon ?? "flag-fill");
  const [color, setColor] = useState(initialGoal?.color ?? "#FFFFFF");
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onToggle={(event) => {
        if (event.newState !== "open") return;
        form.current?.reset();
        setIcon(initialGoal?.icon ?? "flag-fill");
        setColor(initialGoal?.color ?? "#FFFFFF");
      }}
      onClose={() => {
        form.current?.reset();
        setIcon(initialGoal?.icon ?? "flag-fill");
        setColor(initialGoal?.color ?? "#FFFFFF");
        setError("");
        setFormKey((key) => key + 1);
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
      className="new-goal-modal app-scrollbar dashboard-motion fixed m-auto max-h-[calc(100svh-32px)] w-[calc(100%-32px)] max-w-[500px] overflow-y-auto rounded-lg border border-zinc-800 bg-black p-6 text-white [color-scheme:dark] sm:p-7 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-white"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-xl font-semibold tracking-[-0.4px]">
          {t(initialGoal ? "Editar meta" : "Crear nueva meta")}
        </h2>
        <TooltipButton
          type="button"
          aria-label={t("Cerrar")}
          onClick={() => dialogRef.current?.close()}
          className="paint-hover flex cursor-pointer rounded p-1 text-zinc-400"
        >
          <PaintHover>
            <i aria-hidden="true" className="bi bi-x-lg text-sm leading-none" />
          </PaintHover>
        </TooltipButton>
      </div>
      <p
        id={descriptionId}
        className="mb-6 mt-3 text-xs leading-5 text-zinc-400"
      >
        {t(
          initialGoal
            ? "Actualiza los detalles de tu meta."
            : "Añade el nombre y personaliza el icono de tu meta.",
        )}
      </p>
      <form
        ref={form}
        key={formKey}
        onSubmit={(event) => {
          event.preventDefault();
          const nameInput = event.currentTarget.elements.namedItem(
            "name",
          ) as HTMLInputElement;
          if (!nameInput.value.trim()) {
            nameInput.setCustomValidity(t("Escribe el nombre de la meta."));
            nameInput.reportValidity();
            return;
          }
          const data = new FormData(event.currentTarget);
          try {
            onCreate({
              name: nameInput.value.trim(),
              description: String(data.get("description") ?? "").trim(),
              icon,
              color,
            });
            dialogRef.current?.close();
          } catch {
            setError(
              "No se pudo guardar la meta en este navegador. El formulario se ha conservado.",
            );
          }
        }}
        className="flex flex-col gap-5"
      >
        <label className="flex flex-col gap-2 text-xs">
          {t("Nombre de la meta")}
          <input
            name="name"
            defaultValue={initialGoal?.name ?? ""}
            required
            maxLength={100}
            autoFocus
            placeholder={t("Ej. Aprender inglés")}
            onInput={(event) => event.currentTarget.setCustomValidity("")}
            className="min-h-10 rounded border border-zinc-800 bg-black px-3 text-[13px] outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs">
          {t("Descripción (opcional)")}
          <textarea
            name="description"
            defaultValue={initialGoal?.description ?? ""}
            maxLength={1000}
            rows={3}
            placeholder={t("Describe la meta")}
            className="min-h-24 resize-y rounded border border-zinc-800 bg-black px-3 py-2.5 text-[13px] leading-5 outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-xs">{t("Icono")}</span>
          <IconPicker
            icon={icon}
            color={color}
            onIconChange={setIcon}
            onColorChange={setColor}
          />
        </div>
        {error && (
          <p role="alert" className="text-xs leading-5 text-red-400">
            {t(error)}
          </p>
        )}
        <div className="mt-1 flex justify-end gap-2 border-t border-zinc-800 pt-5">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="paint-hover flex cursor-pointer rounded border border-zinc-800 px-3 py-2 text-xs"
          >
            <PaintHover>{t("Cancelar")}</PaintHover>
          </button>
          <button
            type="submit"
            className="paint-hover flex cursor-pointer items-center gap-2 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium"
          >
            <PaintHover>
              <Icon name={initialGoal ? "tick" : "plus"} className="size-4" />
              {t(initialGoal ? "Guardar cambios" : "Crear meta")}
            </PaintHover>
          </button>
        </div>
      </form>
    </dialog>
  );
}
