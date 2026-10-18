import type { KeyboardEvent, RefObject } from "react";
import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";

export type BranchTextFieldName = "description" | "notes";

export default function BranchTextField({
  field,
  id,
  value,
  editing,
  textareaRef,
  onEdit,
  onKeyDown,
  onUpdate,
}: {
  field: BranchTextFieldName;
  id: string;
  value?: string;
  editing: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onEdit: (field: BranchTextFieldName) => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLTextAreaElement>,
    field: BranchTextFieldName,
  ) => void;
  onUpdate: (field: BranchTextFieldName, value: string) => void;
}) {
  const { t } = useLanguage();
  const description = field === "description";

  return (
    <div
      className="branch-edit-field"
      data-field={field}
      tabIndex={-1}
      data-editing={editing || undefined}
    >
      {!editing && value && <p className="branch-field-text">{value}</p>}
      <textarea
        ref={textareaRef}
        hidden={!editing}
        id={id}
        readOnly={!editing}
        tabIndex={editing ? 0 : -1}
        aria-label={t(
          description ? "Descripción de la meta" : "Notas de la meta",
        )}
        className={description ? "branch-description" : "branch-notes"}
        defaultValue={value ?? ""}
        placeholder={t(
          description ? "Añadir una descripción…" : "Escribe tus notas…",
        )}
        rows={description ? 2 : 4}
        maxLength={description ? 4000 : 10000}
        onKeyDown={(event) => onKeyDown(event, field)}
        onBlur={(event) => {
          if (event.currentTarget.value !== (value ?? ""))
            onUpdate(field, event.currentTarget.value);
        }}
      />
      <TooltipButton
        id={`${id}-edit`}
        type="button"
        className="branch-edit-button"
        aria-label={t(
          editing
            ? description
              ? "Guardar descripción"
              : "Guardar notas"
            : description
              ? "Editar descripción"
              : "Editar notas",
        )}
        aria-controls={id}
        onClick={() => onEdit(field)}
      >
        <i
          aria-hidden="true"
          className={`bi bi-${editing ? "check-lg" : "pencil"}`}
        />
        {!editing && !value && (
          <span>
            {t(description ? "Escribe una descripción" : "Escribe una nota")}
          </span>
        )}
      </TooltipButton>
    </div>
  );
}
