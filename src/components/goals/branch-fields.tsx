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
import BranchProperties from "./branch-properties";
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
  const [editingName, setEditingName] = useState(false);
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
        <button
          type="button"
          className="branch-edit-name"
          aria-label={t("Editar nombre")}
          aria-expanded={editingName}
          onClick={() => setEditingName((value) => !value)}
        >
          <i aria-hidden="true" className="bi bi-pencil" />
        </button>
      </div>
      {editingName && (
        <form
          className="branch-name-form"
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem(
              "name",
            ) as HTMLInputElement;
            const name = input.value.trim();
            if (!name) {
              input.setCustomValidity(t("Escribe el nombre de la meta."));
              input.reportValidity();
              return;
            }
            if (name && name.length <= 100 && update({ name }))
              setEditingName(false);
          }}
        >
          <input
            name="name"
            aria-label={t("Nombre de la meta")}
            defaultValue={activity.name}
            required
            onInput={(event) => event.currentTarget.setCustomValidity("")}
            maxLength={100}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              setEditingName(false);
            }}
          />
          <button type="submit" aria-label={t("Guardar cambios")}>
            <i aria-hidden="true" className="bi bi-check-lg" />
          </button>
          <button
            type="button"
            aria-label={t("Cancelar")}
            onClick={() => setEditingName(false)}
          >
            <i aria-hidden="true" className="bi bi-x-lg" />
          </button>
        </form>
      )}
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
      <BranchProperties activity={activity} onUpdate={update} />
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
