import { useState } from "react";
import { ActivityStatus } from "./goal-diagram";
import type { GoalActivity, GoalActivityChanges } from "@/lib/goal-activities";
import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";
import { animateField } from "./branch-field-animations";
import ValidatedForm from "@/components/validated-form";

export default function BranchSubtaskField({
  activity,
  addingTask,
  setAddingTask,
  update,
  setError,
}: {
  activity: GoalActivity;
  addingTask: boolean;
  setAddingTask: (adding: boolean) => void;
  update: (changes: GoalActivityChanges) => boolean;
  setError: (error: string) => void;
}) {
  const { t, language } = useLanguage();
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const children = activity.subtasks ?? [];
  const completed = children.filter(
    (child) => child.status === "completed",
  ).length;

  return (
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
              {editingTask === child.id ? (
                <ValidatedForm
                  className="branch-inline-form branch-compact-form"
                  aria-label={`${t("Editar subtarea")}: ${child.name}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const input = event.currentTarget.elements.namedItem(
                      "name",
                    ) as HTMLInputElement;
                    const name = input.value.trim();
                    if (
                      update((current) => ({
                        subtasks: current.subtasks?.map((task) =>
                          task.id === child.id ? { ...task, name } : task,
                        ),
                      }))
                    )
                      setEditingTask(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape") return;
                    event.preventDefault();
                    event.stopPropagation();
                    setEditingTask(null);
                  }}
                >
                  <input
                    name="name"
                    aria-label={t("Nombre de la subtarea")}
                    defaultValue={child.name}
                    required
                    pattern={".*\\S.*"}
                    maxLength={100}
                    autoFocus
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button type="submit" aria-label={t("Guardar subtarea")}>
                    <i aria-hidden="true" className="bi bi-check-lg" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("Cancelar")}
                    onClick={() => setEditingTask(null)}
                  >
                    <i aria-hidden="true" className="bi bi-x-lg" />
                  </button>
                </ValidatedForm>
              ) : (
                <>
                  <button
                    type="button"
                    className="branch-subtask-toggle"
                    aria-pressed={child.status === "completed"}
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
                  <button
                    type="button"
                    className="branch-subtask-action"
                    aria-label={`${t("Editar subtarea")}: ${child.name}`}
                    onClick={() => setEditingTask(child.id)}
                  >
                    <i aria-hidden="true" className="bi bi-pencil" />
                  </button>
                  <button
                    type="button"
                    className="branch-subtask-action"
                    aria-label={`${t("Eliminar subtarea")}: ${child.name}`}
                    onClick={() =>
                      update((current) => ({
                        subtasks: current.subtasks?.filter(
                          (task) => task.id !== child.id,
                        ),
                      }))
                    }
                  >
                    <i aria-hidden="true" className="bi bi-trash" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="branch-empty">
          {t("Esta meta todavía no tiene subtareas.")}
        </p>
      )}
      {addingTask ? (
        <ValidatedForm
          className="branch-inline-form branch-compact-form"
          aria-label={t("Añadir subtarea")}
          data-form="task"
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem(
              "name",
            ) as HTMLInputElement;
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
            }
          }}
        >
          <input
            name="name"
            aria-label={t("Nombre de la subtarea")}
            placeholder={t("Nombre de la subtarea")}
            required
            pattern={".*\\S.*"}
            maxLength={100}
            autoFocus
          />
          <TooltipButton
            type="submit"
            aria-label={t("Guardar subtarea")}
            title={t("Guardar (Enter)")}
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
              setAddingTask(false);
            }}
          >
            <i aria-hidden="true" className="bi bi-x-lg" />
          </TooltipButton>
        </ValidatedForm>
      ) : (
        <button
          type="button"
          className="branch-add-task"
          disabled={children.length >= 2000}
          onClick={() => setAddingTask(true)}
        >
          <i aria-hidden="true" className="bi bi-plus-lg" />
          {t("Añadir subtarea")}
        </button>
      )}
      {children.length >= 2000 && (
        <p className="branch-empty">
          {t("Se alcanzó el límite de 2.000 subtareas por rama.")}
        </p>
      )}
    </section>
  );
}
