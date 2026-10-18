"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  type GoalActivity,
  type GoalActivityChanges,
} from "@/lib/goal-activities";
import { ActivityStatus } from "./goal-diagram";
import Select from "@/components/select";
import DatePicker from "@/components/date-picker";
import BranchColorPicker from "./branch-color-picker";
import { useLanguage } from "@/components/language-provider";
import BranchTextField, { type BranchTextFieldName } from "./branch-text-field";
import BranchResourceField from "./branch-resource-field";
import BranchSubtaskField from "./branch-subtask-field";
import { animateField } from "./branch-field-animations";

export default function BranchFields({
  activity,
  onUpdate,
}: {
  activity: GoalActivity;
  onUpdate: (id: string, changes: GoalActivityChanges) => boolean;
}) {
  const { t } = useLanguage();
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
  const fieldId = useId();

  function update(changes: GoalActivityChanges, id = activity.id) {
    const saved = onUpdate(id, changes);
    setError(
      saved ? "" : "No se pudieron guardar los cambios. Inténtalo de nuevo.",
    );
    return saved;
  }

  function edit(field: BranchTextFieldName) {
    const textarea = field === "description" ? description : notes;
    if (editing === field) {
      const value = textarea.current?.value ?? "";
      if (value === (activity[field] ?? "") || update({ [field]: value }))
        setEditing(null);
      return;
    }
    setEditing(field);
    requestAnimationFrame(() => textarea.current?.focus());
  }

  function saveOnEnter(
    event: KeyboardEvent<HTMLTextAreaElement>,
    field: BranchTextFieldName,
  ) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (update({ [field]: event.currentTarget.value })) {
      setEditing(null);
      requestAnimationFrame(() =>
        (field === "description"
          ? description
          : notes
        ).current?.parentElement?.focus({
          preventScroll: true,
        }),
      );
    }
  }

  function updateTextField(field: BranchTextFieldName, value: string) {
    update(field === "description" ? { description: value } : { notes: value });
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
      <BranchTextField
        field="description"
        id={`${fieldId}-description`}
        value={activity.description}
        editing={editing === "description"}
        textareaRef={description}
        onEdit={edit}
        onKeyDown={saveOnEnter}
        onUpdate={updateTextField}
      />
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
      <BranchResourceField
        activity={activity}
        addingResource={addingResource}
        setAddingResource={setAddingResource}
        readingFile={readingFile}
        setReadingFile={setReadingFile}
        update={update}
        setError={setError}
      />
      <section aria-labelledby={`notes-${activity.id}`}>
        <h3 id={`notes-${activity.id}`}>{t("Notas")}</h3>
        <BranchTextField
          field="notes"
          id={`${fieldId}-notes`}
          value={activity.notes}
          editing={editing === "notes"}
          textareaRef={notes}
          onEdit={edit}
          onKeyDown={saveOnEnter}
          onUpdate={updateTextField}
        />
      </section>
      <BranchSubtaskField
        activity={activity}
        addingTask={addingTask}
        setAddingTask={setAddingTask}
        update={update}
        setError={setError}
      />
    </div>
  );
}
