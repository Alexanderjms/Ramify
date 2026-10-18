"use client";

import { useRef, useState, type RefObject } from "react";
import type { Goal } from "@/lib/goals";
import Icon from "@/components/icon";
import PaintHover from "@/components/paint-hover";
import IconPicker from "./icon-picker";
import "./new-goal-modal.css";

export default function NewGoalModal({
  dialogRef,
  onCreate,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onCreate: (
    goal: Pick<Goal, "name" | "description" | "icon" | "color">,
  ) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [icon, setIcon] = useState("flag-fill");
  const [color, setColor] = useState("#FFFFFF");
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="new-goal-title"
      aria-describedby="new-goal-description"
      onClose={() => {
        form.current?.reset();
        setIcon("flag-fill");
        setColor("#FFFFFF");
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
        <h2
          id="new-goal-title"
          className="text-xl font-semibold tracking-[-0.4px]"
        >
          Crear nueva meta
        </h2>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={() => dialogRef.current?.close()}
          className="paint-hover flex cursor-pointer rounded p-1 text-zinc-400"
        >
          <PaintHover>
            <i aria-hidden="true" className="bi bi-x-lg text-sm leading-none" />
          </PaintHover>
        </button>
      </div>
      <p
        id="new-goal-description"
        className="mb-6 mt-3 text-xs leading-5 text-zinc-400"
      >
        Añade el nombre y personaliza el icono de tu meta.
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
            nameInput.setCustomValidity("Escribe el nombre de la meta.");
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
          Nombre de la meta
          <input
            name="name"
            required
            maxLength={100}
            autoFocus
            placeholder="Ej. Aprender inglés"
            onInput={(event) => event.currentTarget.setCustomValidity("")}
            className="min-h-10 rounded border border-zinc-800 bg-black px-3 text-[13px] outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs">
          Descripción (opcional)
          <textarea
            name="description"
            maxLength={1000}
            rows={3}
            placeholder="Describe la meta"
            className="min-h-24 resize-y rounded border border-zinc-800 bg-black px-3 py-2.5 text-[13px] leading-5 outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-xs">Icono</span>
          <IconPicker
            icon={icon}
            color={color}
            onIconChange={setIcon}
            onColorChange={setColor}
          />
        </div>
        {error && (
          <p role="alert" className="text-xs leading-5 text-red-400">
            {error}
          </p>
        )}
        <div className="mt-1 flex justify-end gap-2 border-t border-zinc-800 pt-5">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="paint-hover flex cursor-pointer rounded border border-zinc-800 px-3 py-2 text-xs"
          >
            <PaintHover>Cancelar</PaintHover>
          </button>
          <button
            type="submit"
            className="paint-hover flex cursor-pointer items-center gap-2 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium"
          >
            <PaintHover>
              <Icon name="plus" className="size-4" />
              Crear meta
            </PaintHover>
          </button>
        </div>
      </form>
    </dialog>
  );
}
