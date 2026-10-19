"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { useLanguage } from "@/components/language-provider";
import "./new-goal-modal.css";
import { FormError } from "@/components/app-feedback";
import { errorMessage } from "@/lib/feedback";
import { gooeyToast } from "goey-toast";

export default function DeleteGoalDialog({
  dialogRef,
  name,
  onDelete,
  branch = false,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  name: string;
  onDelete: () => void | Promise<void>;
  branch?: boolean;
}) {
  const { t } = useLanguage();
  const titleId = useId();
  const descriptionId = useId();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={() => setError("")}
      onCancel={(event) => {
        if (submitting.current) event.preventDefault();
      }}
      className="new-goal-modal app-scrollbar dashboard-motion fixed m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[420px] overflow-y-auto overscroll-contain rounded-lg border border-zinc-800 bg-black p-4 text-white [color-scheme:dark] sm:p-6 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-white"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {t(branch ? "Eliminar rama" : "Eliminar meta")}
      </h2>
      <p className="mt-3 text-sm font-medium [overflow-wrap:anywhere]">
        {name}
      </p>
      <p id={descriptionId} className="mt-2 text-xs leading-5 text-zinc-400">
        {t(
          branch
            ? "Se eliminarán esta rama y sus descendientes, subtareas y recursos. Esta acción no se puede deshacer."
            : "Se eliminarán esta meta y todas sus ramas, subtareas y recursos. Esta acción no se puede deshacer.",
        )}
      </p>
      <FormError>{error && t(error)}</FormError>
      <form
        aria-busy={pending}
        className="mt-6 flex flex-wrap justify-end gap-2 border-t border-zinc-800 pt-5 [&>button]:min-h-11 sm:[&>button]:min-h-0"
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting.current) return;
          submitting.current = true;
          setPending(true);
          setError("");
          try {
            await onDelete();
            dialogRef.current?.close();
            gooeyToast.success(
              t(branch ? "Rama eliminada" : "Meta eliminada"),
              {
                description: branch
                  ? t(
                      "Guardado en este navegador; pendiente de sincronización.",
                    )
                  : undefined,
              },
            );
          } catch (error) {
            setError(
              errorMessage(
                error,
                branch
                  ? "No se pudo eliminar la rama. Inténtalo de nuevo."
                  : "No se pudo eliminar la meta. Inténtalo de nuevo.",
              ),
            );
          } finally {
            submitting.current = false;
            setPending(false);
          }
        }}
      >
        <button
          type="button"
          disabled={pending}
          autoFocus
          onClick={() => dialogRef.current?.close()}
          className="cursor-pointer rounded border border-zinc-800 px-3 py-2 text-xs hover:bg-zinc-900"
        >
          {t("Cancelar")}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20"
        >
          {t(
            pending
              ? "Eliminando…"
              : branch
                ? "Eliminar rama"
                : "Eliminar meta",
          )}
        </button>
      </form>
    </dialog>
  );
}
