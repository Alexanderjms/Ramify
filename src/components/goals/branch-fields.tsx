"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  validResourceUrl,
  isStoredGoalFile,
  type GoalActivity,
  type GoalActivityChanges,
} from "@/lib/goal-activities";
import { ActivityStatus } from "./goal-diagram";
import Select from "@/components/select";
import DatePicker from "@/components/date-picker";
import BranchColorPicker from "./branch-color-picker";
import { useLanguage } from "@/components/language-provider";
import {
  downloadGoalFile,
  maxGoalFileSize,
  removeGoalFile,
  saveGoalFile,
} from "@/lib/goal-files";

function animateField(element: HTMLElement, exit = false, move = true) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return element.animate(
    [
      { opacity: 0, transform: reduced || !move ? "none" : "translateY(6px)" },
      { opacity: 1, transform: reduced || !move ? "none" : "translateY(0)" },
    ],
    {
      duration: reduced || exit ? 150 : 200,
      direction: exit ? "reverse" : "normal",
      easing:
        getComputedStyle(element).getPropertyValue("--ease-out").trim() ||
        "ease-out",
    },
  );
}

export default function BranchFields({
  activity,
  onUpdate,
}: {
  activity: GoalActivity;
  onUpdate: (id: string, changes: GoalActivityChanges) => boolean;
}) {
  const { t, language } = useLanguage();
  const [addingResource, setAddingResource] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<"description" | "notes" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef<{
    activity: GoalActivity;
    editing: typeof editing;
    addingResource: boolean;
    addingTask: boolean;
    error: string;
  } | null>(null);
  const animations = useRef(new Map<HTMLElement, Animation>());
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { activity, editing, addingResource, addingTask, error };
    if (!before || !root.current) return;
    const enter = (selector: string, move = true) => {
      root.current
        ?.querySelectorAll<HTMLElement>(selector)
        .forEach((element) => {
          animations.current.get(element)?.cancel();
          const animation = animateField(element, false, move);
          animations.current.set(element, animation);
          animation.onfinish = () => animations.current.delete(element);
        });
    };
    for (const field of ["description", "notes"] as const) {
      if (
        (before.editing !== editing &&
          (before.editing === field || editing === field)) ||
        (activity[field] !== before.activity[field] && editing !== field)
      ) {
        enter(`[data-field="${field}"] > :not([hidden])`);
      }
    }
    if (before.addingResource !== addingResource)
      enter(
        addingResource ? '[data-form="resource"]' : ".branch-resource-actions",
      );
    if (before.addingTask !== addingTask)
      enter(addingTask ? '[data-form="task"]' : ".branch-add-task");
    root.current
      .querySelectorAll<HTMLElement>("[data-resource-id]")
      .forEach((element) => {
        if (
          !before.activity.resources?.some(
            (item) => item.id === element.dataset.resourceId,
          )
        )
          enter(
            `[data-resource-id="${CSS.escape(element.dataset.resourceId!)}"]`,
          );
      });
    root.current
      .querySelectorAll<HTMLElement>("[data-task-id]")
      .forEach((element) => {
        const task = activity.subtasks?.find(
          (item) => item.id === element.dataset.taskId,
        );
        const old = before.activity.subtasks?.find(
          (item) => item.id === element.dataset.taskId,
        );
        if (!old || old.status !== task?.status)
          enter(
            `[data-task-id="${CSS.escape(element.dataset.taskId!)}"]`,
            !old,
          );
      });
    for (const field of [
      "status",
      "priority",
      "targetDate",
      "color",
    ] as const) {
      if (activity[field] !== before.activity[field])
        enter(`[data-field="${field}"]`, false);
    }
    if (error && error !== before.error) enter(".branch-field-error");
  }, [activity, editing, addingResource, addingTask, error]);
  useLayoutEffect(() => {
    const running = animations.current;
    return () => {
      running.forEach((animation) => animation.cancel());
      running.clear();
    };
  }, []);
  const description = useRef<HTMLTextAreaElement>(null);
  const notes = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const children = activity.subtasks ?? [];
  const completed = children.filter(
    (child) => child.status === "completed",
  ).length;
  function update(changes: GoalActivityChanges, id = activity.id) {
    const saved = onUpdate(id, changes);
    setError(
      saved ? "" : "No se pudieron guardar los cambios. Inténtalo de nuevo.",
    );
    return saved;
  }

  function edit(field: "description" | "notes") {
    if (editing === field) {
      const value =
        (field === "description" ? description : notes).current?.value ?? "";
      if (value === (activity[field] ?? "") || update({ [field]: value }))
        setEditing(null);
      return;
    }
    setEditing(field);
    requestAnimationFrame(() =>
      (field === "description" ? description : notes).current?.focus(),
    );
  }

  function saveOnEnter(
    event: KeyboardEvent<HTMLTextAreaElement>,
    field: "description" | "notes",
  ) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (update({ [field]: event.currentTarget.value })) {
      setEditing(null);
      requestAnimationFrame(() =>
        (field === "description"
          ? description
          : notes
        ).current?.parentElement?.focus({ preventScroll: true }),
      );
    }
  }

  return (
    <div ref={root} className="branch-fields">
      <div className="branch-title">
        <div data-field="color" className="flex shrink-0">
          <BranchColorPicker
            name={activity.name}
            color={activity.color}
            onChange={(color) => update({ color })}
          />
        </div>
        <h2 id="branch-details-title">{activity.name}</h2>
      </div>
      <div
        className="branch-edit-field"
        data-field="description"
        tabIndex={-1}
        data-editing={editing === "description" || undefined}
      >
        {editing !== "description" && activity.description && (
          <p className="branch-field-text">{activity.description}</p>
        )}
        <textarea
          ref={description}
          hidden={editing !== "description"}
          id={`${fieldId}-description`}
          readOnly={editing !== "description"}
          tabIndex={editing === "description" ? 0 : -1}
          aria-label={t("Descripción de la meta")}
          className="branch-description"
          defaultValue={activity.description ?? ""}
          placeholder={t("Añadir una descripción…")}
          rows={2}
          maxLength={4000}
          onKeyDown={(event) => saveOnEnter(event, "description")}
          onBlur={(event) => {
            if (event.currentTarget.value !== (activity.description ?? ""))
              update({ description: event.currentTarget.value });
          }}
        />
        <button
          id={`${fieldId}-description-edit`}
          type="button"
          className="branch-edit-button"
          aria-label={t(
            editing === "description"
              ? "Guardar descripción"
              : "Editar descripción",
          )}
          aria-controls={`${fieldId}-description`}
          onClick={() => edit("description")}
        >
          <i
            aria-hidden="true"
            className={`bi bi-${editing === "description" ? "check-lg" : "pencil"}`}
          />
          {editing !== "description" && !activity.description && (
            <span>{t("Escribe una descripción")}</span>
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="branch-field-error">
          {t(error)}
        </p>
      )}
      <dl className="branch-properties">
        <div>
          <dt>{t("Estado")}</dt>
          <dd data-field="status">
            <Select
              label="Estado"
              value={activity.status}
              options={[
                {
                  value: "pending",
                  label: "Pendiente",
                  icon: <ActivityStatus status="pending" />,
                },
                {
                  value: "progress",
                  label: "En proceso",
                  icon: <ActivityStatus status="progress" />,
                },
                {
                  value: "completed",
                  label: "Completada",
                  icon: <ActivityStatus status="completed" />,
                },
              ]}
              icon={<ActivityStatus status={activity.status} />}
              onChange={(status) => update({ status })}
            />
          </dd>
        </div>
        <div>
          <dt>{t("Prioridad")}</dt>
          <dd data-field="priority">
            <Select
              label="Prioridad"
              value={activity.priority ?? "medium"}
              options={[
                {
                  value: "low",
                  label: "Baja",
                  icon: <i aria-hidden="true" className="bi bi-reception-1" />,
                },
                {
                  value: "medium",
                  label: "Media",
                  icon: <i aria-hidden="true" className="bi bi-reception-2" />,
                },
                {
                  value: "high",
                  label: "Alta",
                  icon: <i aria-hidden="true" className="bi bi-reception-3" />,
                },
              ]}
              icon={
                <i
                  aria-hidden="true"
                  className={`bi bi-reception-${activity.priority === "low" ? 1 : activity.priority === "high" ? 3 : 2}`}
                />
              }
              onChange={(priority) => update({ priority })}
            />
          </dd>
        </div>
        <div>
          <dt>{t("Fecha objetivo")}</dt>
          <dd data-field="targetDate">
            <DatePicker
              label="Fecha objetivo"
              value={activity.targetDate ?? ""}
              onChange={(targetDate) => update({ targetDate })}
            />
          </dd>
        </div>
      </dl>
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
                        "No se pudo descargar el archivo. Comprueba que sigue guardado en este navegador.",
                      );
                    }
                  }}
                >
                  {resource.fileName ?? resource.url}
                </a>
                <button
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
                          "Se quitó el recurso, pero no se pudo liberar el archivo local.",
                        );
                      }
                    }
                    button.disabled = false;
                  }}
                >
                  <i aria-hidden="true" className="bi bi-x" />
                </button>
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
              const urlInput = form.elements.namedItem(
                "url",
              ) as HTMLInputElement;
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
            <button
              type="submit"
              aria-label={t("Guardar recurso")}
              title={t("Guardar recurso")}
            >
              <i aria-hidden="true" className="bi bi-check-lg" />
            </button>
            <button
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
            </button>
          </form>
        ) : (
          <div className="branch-resource-actions">
            <button
              type="button"
              className="branch-add-resource"
              disabled={readingFile || (activity.resources?.length ?? 0) >= 50}
              onClick={() => setAddingResource(true)}
            >
              {t("+ Añadir recurso")}
            </button>
            <button
              type="button"
              className="branch-add-resource"
              title={t(
                "Adjuntar archivo (máximo 20 MB, guardado en este navegador)",
              )}
              disabled={readingFile || (activity.resources?.length ?? 0) >= 50}
              onClick={() => fileInput.current?.click()}
            >
              <i aria-hidden="true" className="bi bi-paperclip" />
              {t(readingFile ? "Leyendo…" : "Adjuntar archivo")}
            </button>
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
                "No se pudo guardar el archivo. Comprueba el espacio disponible en este navegador.",
              );
            } finally {
              setReadingFile(false);
            }
          }}
        />
      </section>
      <section aria-labelledby={`notes-${activity.id}`}>
        <h3 id={`notes-${activity.id}`}>{t("Notas")}</h3>
        <div
          className="branch-edit-field"
          data-field="notes"
          tabIndex={-1}
          data-editing={editing === "notes" || undefined}
        >
          {editing !== "notes" && activity.notes && (
            <p className="branch-field-text">{activity.notes}</p>
          )}
          <textarea
            ref={notes}
            hidden={editing !== "notes"}
            id={`${fieldId}-notes`}
            readOnly={editing !== "notes"}
            tabIndex={editing === "notes" ? 0 : -1}
            aria-label={t("Notas de la meta")}
            className="branch-notes"
            rows={4}
            maxLength={10000}
            defaultValue={activity.notes ?? ""}
            placeholder={t("Escribe tus notas…")}
            onKeyDown={(event) => saveOnEnter(event, "notes")}
            onBlur={(event) => {
              if (event.currentTarget.value !== (activity.notes ?? ""))
                update({ notes: event.currentTarget.value });
            }}
          />
          <button
            id={`${fieldId}-notes-edit`}
            type="button"
            className="branch-edit-button"
            aria-label={t(
              editing === "notes" ? "Guardar notas" : "Editar notas",
            )}
            aria-controls={`${fieldId}-notes`}
            onClick={() => edit("notes")}
          >
            <i
              aria-hidden="true"
              className={`bi bi-${editing === "notes" ? "check-lg" : "pencil"}`}
            />
            {editing !== "notes" && !activity.notes && (
              <span>{t("Escribe una nota")}</span>
            )}
          </button>
        </div>
      </section>
      <section aria-labelledby={`tasks-${activity.id}`}>
        <h3 id={`tasks-${activity.id}`}>
          {t("Subtareas")}{" "}
          <span>
            · {completed} / {children.length}
          </span>
        </h3>
        {!!children.length && (
          <div
            className="sr-only"
            role="progressbar"
            aria-label={t("Progreso de las subtareas")}
            aria-valuenow={Math.round((completed / children.length) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        )}
        {children.length ? (
          <ul className="branch-subtasks">
            {children.map((child) => (
              <li key={child.id} data-task-id={child.id}>
                <button
                  type="button"
                  aria-label={
                    language === "en"
                      ? `Mark ${child.name} as ${child.status === "completed" ? "pending" : "completed"}`
                      : `Marcar ${child.name} como ${child.status === "completed" ? "pendiente" : "completada"}`
                  }
                  onClick={() =>
                    update((current) => ({
                      subtasks: current.subtasks?.map((task) =>
                        task.id === child.id
                          ? {
                              ...task,
                              status:
                                task.status === "completed"
                                  ? "pending"
                                  : "completed",
                            }
                          : task,
                      ),
                    }))
                  }
                >
                  <ActivityStatus status={child.status} />
                  <span>{child.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="branch-empty">
            {t("Esta meta todavía no tiene subtareas.")}
          </p>
        )}
        {addingTask ? (
          <form
            className="branch-inline-form branch-compact-form"
            aria-label={t("Añadir subtarea")}
            data-form="task"
            onSubmit={(event) => {
              event.preventDefault();
              const input = event.currentTarget.elements.namedItem(
                "name",
              ) as HTMLInputElement;
              if (!input.value.trim()) {
                input.setCustomValidity(t("Escribe el nombre de la subtarea."));
                input.reportValidity();
                return;
              }
              const task = {
                id: crypto.randomUUID(),
                name: input.value.trim(),
                status: "pending" as const,
              };
              if (
                update((current) => ({
                  subtasks: [...(current.subtasks ?? []), task],
                }))
              ) {
                setAddingTask(false);
                setError("");
              } else
                setError("No se pudo guardar la subtarea. Inténtalo de nuevo.");
            }}
          >
            <input
              name="name"
              aria-label={t("Nombre de la subtarea")}
              placeholder={t("Nombre de la subtarea")}
              required
              maxLength={100}
              autoFocus
              onInput={(event) => event.currentTarget.setCustomValidity("")}
            />
            <button
              type="submit"
              aria-label={t("Guardar subtarea")}
              title={t("Guardar (Enter)")}
            >
              <i aria-hidden="true" className="bi bi-check-lg" />
            </button>
            <button
              type="button"
              aria-label={t("Cancelar")}
              title={t("Cancelar")}
              onClick={async (event) => {
                await animateField(
                  event.currentTarget.closest("form")!,
                  true,
                ).finished.catch(() => {});
                setAddingTask(false);
              }}
            >
              <i aria-hidden="true" className="bi bi-x-lg" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="branch-add-task"
            onClick={() => setAddingTask(true)}
          >
            <i aria-hidden="true" className="bi bi-plus-lg" />
            {t("Añadir subtarea")}
          </button>
        )}
      </section>
    </div>
  );
}
