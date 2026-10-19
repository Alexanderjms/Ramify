"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useLanguage } from "@/components/language-provider";
import { FormError } from "@/components/app-feedback";
import { errorMessage } from "@/lib/feedback";

export type SyncConflictDialogHandle = { open: () => void };

const SyncConflictDialog = forwardRef<
  SyncConflictDialogHandle,
  { onOverwrite: () => Promise<void> }
>(function SyncConflictDialog({ onOverwrite }, ref) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        setError("");
        dialog.current?.showModal();
      },
    }),
    [],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resolving) return;
    setResolving(true);
    setError("");
    try {
      await onOverwrite();
      dialog.current?.close();
    } catch (error) {
      setError(
        errorMessage(error, "No se pudieron cargar las metas de Turso."),
      );
    } finally {
      setResolving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="sync-conflict-title"
      className="new-goal-modal fixed m-auto w-[calc(100%-32px)] max-w-md rounded-lg border border-zinc-800 bg-black p-6 text-white"
      onCancel={(event) => {
        if (resolving) event.preventDefault();
      }}
    >
      <h2 id="sync-conflict-title" className="text-lg font-semibold">
        {t("Conflicto de sincronización")}
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {t(
          "Otra sesión modificó el diagrama. ¿Reemplazar su versión con tus cambios locales?",
        )}
      </p>
      <FormError>{error && t(error)}</FormError>
      <form className="mt-5 flex justify-end gap-3" onSubmit={submit}>
        <button
          type="button"
          className="cursor-pointer rounded border border-zinc-700 px-3 py-2 text-xs"
          disabled={resolving}
          onClick={() => dialog.current?.close()}
        >
          {t("Cancelar")}
        </button>
        <button
          type="submit"
          className="cursor-pointer rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs"
          disabled={resolving}
        >
          {t(resolving ? "Guardando…" : "Reemplazar versión")}
        </button>
      </form>
    </dialog>
  );
});

export default SyncConflictDialog;
