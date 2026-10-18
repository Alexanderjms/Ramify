import { useRef } from "react";
import {
  isStoredGoalFile,
  validResourceUrl,
  type GoalActivity,
  type GoalActivityChanges,
} from "@/lib/goal-activities";
import {
  downloadGoalFile,
  maxGoalFileSize,
  removeGoalFile,
  saveGoalFile,
} from "@/lib/goal-files";
import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";
import { animateField } from "./branch-field-animations";

export default function BranchResourceField({
  activity,
  addingResource,
  setAddingResource,
  readingFile,
  setReadingFile,
  update,
  setError,
}: {
  activity: GoalActivity;
  addingResource: boolean;
  setAddingResource: (adding: boolean) => void;
  readingFile: boolean;
  setReadingFile: (reading: boolean) => void;
  update: (changes: GoalActivityChanges) => boolean;
  setError: (error: string) => void;
}) {
  const { t, language } = useLanguage();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <section aria-labelledby={`resources-${activity.id}`}>
      <h3 id={`resources-${activity.id}`}>{t("Recursos")}</h3>
      {!!activity.resources?.length && (
        <ul className="branch-resources">
          {activity.resources.map((resource) => (
            <li key={resource.id} data-resource-id={resource.id}>
              <i
                aria-hidden="true"
                className={`bi bi-${resource.fileName || /\.pdf(?:$|[?#])/i.test(resource.url) ? "file-earmark-text" : "box-arrow-up-right"}`}
              />
              <a
                href={isStoredGoalFile(resource.url) ? "#" : resource.url}
                target={resource.fileName ? undefined : "_blank"}
                download={resource.fileName}
                rel="noopener noreferrer"
                onClick={async (event) => {
                  if (!isStoredGoalFile(resource.url)) return;
                  event.preventDefault();
                  try {
                    await downloadGoalFile(resource.url, resource.fileName!);
                  } catch {
                    setError(
                      "No se pudo descargar el archivo. Comprueba tu conexión e inténtalo de nuevo.",
                    );
                  }
                }}
              >
                {resource.fileName ?? resource.url}
              </a>
              <TooltipButton
                type="button"
                aria-label={`${language === "en" ? "Remove resource" : "Eliminar recurso"} ${resource.fileName ?? resource.url}`}
                onClick={async (event) => {
                  const button = event.currentTarget;
                  button.disabled = true;
                  await animateField(
                    button.closest("li")!,
                    true,
                  ).finished.catch(() => {});
                  const removed = update((current) => ({
                    resources: current.resources!.filter(
                      (item) => item.id !== resource.id,
                    ),
                  }));
                  if (removed && isStoredGoalFile(resource.url)) {
                    try {
                      await removeGoalFile(resource.url);
                    } catch {
                      setError(
                        "Se quitó el recurso, pero no se pudo liberar el archivo. Se reintentará al sincronizar.",
                      );
                    }
                  }
                  button.disabled = false;
                }}
              >
                <i aria-hidden="true" className="bi bi-x" />
              </TooltipButton>
            </li>
          ))}
        </ul>
      )}
      {addingResource ? (
        <form
          className="branch-inline-form branch-compact-form"
          aria-label={t("Añadir recurso")}
          data-form="resource"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const urlInput = form.elements.namedItem("url") as HTMLInputElement;
            const url = urlInput.value.trim();
            if (!validResourceUrl(url)) {
              urlInput.setCustomValidity(
                t("Usa un enlace http:// o https:// válido."),
              );
              urlInput.reportValidity();
              return;
            }
            if (
              update({
                resources: [
                  ...(activity.resources ?? []),
                  { id: crypto.randomUUID(), url },
                ],
              })
            )
              setAddingResource(false);
          }}
        >
          <input
            name="url"
            type="url"
            aria-label={t("Enlace del recurso")}
            placeholder="https://…"
            maxLength={2000}
            required
            autoFocus
            onInput={(event) => event.currentTarget.setCustomValidity("")}
          />
          <TooltipButton
            type="submit"
            aria-label={t("Guardar recurso")}
            title={t("Guardar recurso")}
          >
            <i aria-hidden="true" className="bi bi-check-lg" />
          </TooltipButton>
          <TooltipButton
            type="button"
            aria-label={t("Cancelar")}
            title={t("Cancelar")}
            onClick={async (event) => {
              await animateField(
                event.currentTarget.closest("form")!,
                true,
              ).finished.catch(() => {});
              setAddingResource(false);
            }}
          >
            <i aria-hidden="true" className="bi bi-x-lg" />
          </TooltipButton>
        </form>
      ) : (
        <div className="branch-resource-actions">
          <TooltipButton
            type="button"
            className="branch-add-resource"
            disabled={readingFile || (activity.resources?.length ?? 0) >= 50}
            onClick={() => setAddingResource(true)}
          >
            {t("+ Añadir recurso")}
          </TooltipButton>
          <TooltipButton
            type="button"
            className="branch-add-resource"
            title={t("Adjuntar archivo (máximo 20 MB, guardado en Turso)")}
            disabled={readingFile || (activity.resources?.length ?? 0) >= 50}
            onClick={() => fileInput.current?.click()}
          >
            <i aria-hidden="true" className="bi bi-paperclip" />
            {t(readingFile ? "Subiendo…" : "Adjuntar archivo")}
          </TooltipButton>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        hidden
        aria-label={t("Archivo del recurso")}
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          if (file.size > maxGoalFileSize) {
            setError("El archivo debe pesar como máximo 20 MB.");
            return;
          }
          setReadingFile(true);
          try {
            const url = await saveGoalFile(file);
            const saved = update((current) => ({
              resources: [
                ...(current.resources ?? []),
                {
                  id: crypto.randomUUID(),
                  fileName: file.name,
                  url,
                },
              ],
            }));
            if (!saved) await removeGoalFile(url);
          } catch {
            setError(
              "No se pudo subir el archivo. Comprueba tu conexión e inténtalo de nuevo.",
            );
          } finally {
            setReadingFile(false);
          }
        }}
      />
    </section>
  );
}
