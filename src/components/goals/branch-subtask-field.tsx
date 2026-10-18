import { ActivityStatus } from "./goal-diagram";
import type { GoalActivity, GoalActivityChanges } from "@/lib/goal-activities";
import { useLanguage } from "@/components/language-provider";
import { animateField } from "./branch-field-animations";

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
            } else {
              setError("No se pudo guardar la subtarea. Inténtalo de nuevo.");
            }
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
  );
}
