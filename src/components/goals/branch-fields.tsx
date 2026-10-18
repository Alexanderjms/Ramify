"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import {
  validResourceUrl,
  type GoalActivity,
  type GoalActivityChanges,
} from "@/lib/goal-activities";
import { ActivityStatus } from "./goal-diagram";
import Select from "@/components/select";
import DatePicker from "@/components/date-picker";

export default function BranchFields({
  activity,
  onUpdate,
  onCreate,
}: {
  activity: GoalActivity;
  onUpdate: (id: string, changes: GoalActivityChanges) => boolean;
  onCreate: (parent: string, name: string) => boolean;
}) {
  const [addingResource, setAddingResource] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<"description" | "notes" | null>(null);
  const description = useRef<HTMLTextAreaElement>(null);
  const notes = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const children = activity.children ?? [];
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
    <div className="branch-fields">
      <div className="branch-title">
        <span style={{ background: activity.color }} />
        <h2 id="branch-details-title">{activity.name}</h2>
      </div>
      <div
        className="branch-edit-field"
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
          aria-label="Descripción de la meta"
          className="branch-description"
          defaultValue={activity.description ?? ""}
          placeholder="Añadir una descripción…"
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
          aria-label={
            editing === "description"
              ? "Guardar descripción"
              : "Editar descripción"
          }
          aria-controls={`${fieldId}-description`}
          onClick={() => edit("description")}
        >
          <i
            aria-hidden="true"
            className={`bi bi-${editing === "description" ? "check-lg" : "pencil"}`}
          />
          {editing !== "description" && !activity.description && (
            <span>Escribe una descripción</span>
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="branch-field-error">
          {error}
        </p>
      )}
      <dl className="branch-properties">
        <div>
          <dt>Estado</dt>
          <dd>
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
          <dt>Prioridad</dt>
          <dd>
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
          <dt>Fecha objetivo</dt>
          <dd>
            <DatePicker
              label="Fecha objetivo"
              value={activity.targetDate ?? ""}
              onChange={(targetDate) => update({ targetDate })}
            />
          </dd>
        </div>
      </dl>
      <section aria-labelledby={`resources-${activity.id}`}>
        <h3 id={`resources-${activity.id}`}>Recursos</h3>
        {!!activity.resources?.length && (
          <ul className="branch-resources">
            {activity.resources.map((resource) => (
              <li key={resource.id}>
                <i
                  aria-hidden="true"
                  className={`bi bi-${resource.fileName || /\.pdf(?:$|[?#])/i.test(resource.url) ? "file-earmark-text" : "box-arrow-up-right"}`}
                />
                <a
                  href={resource.url}
                  target={resource.fileName ? undefined : "_blank"}
                  download={resource.fileName}
                  rel="noopener noreferrer"
                >
                  {resource.fileName ?? resource.url}
                </a>
                <button
                  type="button"
                  aria-label={`Eliminar recurso ${resource.fileName ?? resource.url}`}
                  onClick={() =>
                    update({
                      resources: activity.resources!.filter(
                        (item) => item.id !== resource.id,
                      ),
                    })
                  }
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
            aria-label="Añadir recurso"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const urlInput = form.elements.namedItem(
                "url",
              ) as HTMLInputElement;
              const url = urlInput.value.trim();
              if (!validResourceUrl(url)) {
                urlInput.setCustomValidity(
                  "Usa un enlace http:// o https:// válido.",
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
              aria-label="Enlace del recurso"
              placeholder="https://…"
              maxLength={2000}
              required
              autoFocus
              onInput={(event) => event.currentTarget.setCustomValidity("")}
            />
            <button
              type="submit"
              aria-label="Guardar recurso"
              title="Guardar recurso"
            >
              <i aria-hidden="true" className="bi bi-check-lg" />
            </button>
            <button
              type="button"
              aria-label="Cancelar"
              title="Cancelar"
              onClick={() => setAddingResource(false)}
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
              + Añadir recurso
            </button>
            <button
              type="button"
              className="branch-add-resource"
              title="Adjuntar archivo (máximo 1 MB, guardado en este navegador)"
              disabled={readingFile || (activity.resources?.length ?? 0) >= 50}
              onClick={() => fileInput.current?.click()}
            >
              <i aria-hidden="true" className="bi bi-paperclip" />
              {readingFile ? "Leyendo…" : "Adjuntar archivo"}
            </button>
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          hidden
          aria-label="Archivo del recurso"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            // ponytail: archivos locales de hasta 1 MB; usar almacenamiento de objetos para adjuntos grandes.
            if (file.size > 1024 * 1024) {
              setError("El archivo debe pesar como máximo 1 MB.");
              return;
            }
            setReadingFile(true);
            const reader = new FileReader();
            reader.onload = () => {
              const encoded = String(reader.result).split(",")[1];
              update((current) => ({
                resources: [
                  ...(current.resources ?? []),
                  {
                    id: crypto.randomUUID(),
                    fileName: file.name,
                    url: `data:application/octet-stream;base64,${encoded}`,
                  },
                ],
              }));
              setReadingFile(false);
            };
            reader.onerror = () => {
              setError("No se pudo leer el archivo. Inténtalo de nuevo.");
              setReadingFile(false);
            };
            reader.readAsDataURL(file);
          }}
        />
      </section>
      <section aria-labelledby={`notes-${activity.id}`}>
        <h3 id={`notes-${activity.id}`}>Notas</h3>
        <div
          className="branch-edit-field"
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
            aria-label="Notas de la meta"
            className="branch-notes"
            rows={4}
            maxLength={10000}
            defaultValue={activity.notes ?? ""}
            placeholder="Escribe tus notas…"
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
            aria-label={editing === "notes" ? "Guardar notas" : "Editar notas"}
            aria-controls={`${fieldId}-notes`}
            onClick={() => edit("notes")}
          >
            <i
              aria-hidden="true"
              className={`bi bi-${editing === "notes" ? "check-lg" : "pencil"}`}
            />
            {editing !== "notes" && !activity.notes && (
              <span>Escribe una nota</span>
            )}
          </button>
        </div>
      </section>
      <section aria-labelledby={`tasks-${activity.id}`}>
        <h3 id={`tasks-${activity.id}`}>
          Subtareas{" "}
          <span>
            · {completed} / {children.length}
          </span>
        </h3>
        {!!children.length && (
          <div
            className="sr-only"
            role="progressbar"
            aria-label="Progreso de las subtareas"
            aria-valuenow={Math.round((completed / children.length) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        )}
        {children.length ? (
          <ul className="branch-subtasks">
            {children.map((child) => (
              <li key={child.id}>
                <button
                  type="button"
                  aria-label={`Marcar ${child.name} como ${child.status === "completed" ? "pendiente" : "completada"}`}
                  onClick={() =>
                    update(
                      {
                        status:
                          child.status === "completed"
                            ? "pending"
                            : "completed",
                      },
                      child.id,
                    )
                  }
                >
                  <ActivityStatus status={child.status} />
                  <span>{child.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="branch-empty">Esta meta todavía no tiene subtareas.</p>
        )}
        {addingTask ? (
          <form
            className="branch-inline-form branch-compact-form"
            aria-label="Añadir subtarea"
            onSubmit={(event) => {
              event.preventDefault();
              const input = event.currentTarget.elements.namedItem(
                "name",
              ) as HTMLInputElement;
              if (!input.value.trim()) {
                input.setCustomValidity("Escribe el nombre de la subtarea.");
                input.reportValidity();
                return;
              }
              if (onCreate(activity.id, input.value)) {
                setAddingTask(false);
                setError("");
              } else
                setError("No se pudo guardar la subtarea. Inténtalo de nuevo.");
            }}
          >
            <input
              name="name"
              aria-label="Nombre de la subtarea"
              placeholder="Nombre de la subtarea"
              required
              maxLength={100}
              autoFocus
              onInput={(event) => event.currentTarget.setCustomValidity("")}
            />
            <button
              type="submit"
              aria-label="Guardar subtarea"
              title="Guardar (Enter)"
            >
              <i aria-hidden="true" className="bi bi-check-lg" />
            </button>
            <button
              type="button"
              aria-label="Cancelar"
              title="Cancelar"
              onClick={() => setAddingTask(false)}
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
            Añadir subtarea
          </button>
        )}
      </section>
    </div>
  );
}
