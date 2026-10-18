import { useRef, type Dispatch, type SetStateAction } from "react";
import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";

export function GoalDiagramSettings({
  id,
  onEdit,
  onDelete,
}: {
  id: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();

  return (
    <>
      <TooltipButton
        type="button"
        className="goal-settings-button"
        aria-label={t("Ajustes de la meta")}
        title={t("Ajustes de la meta")}
        popoverTarget={id}
      >
        <i aria-hidden="true" className="bi bi-sliders2" />
      </TooltipButton>
      <div
        id={id}
        popover="auto"
        className="goal-settings-menu"
        aria-label={t("Ajustes de la meta")}
      >
        <h2 className="px-3 py-2 text-[11px] font-medium text-zinc-400">
          {t("Ajustes de la meta")}
        </h2>
        <button
          type="button"
          popoverTarget={id}
          popoverTargetAction="hide"
          onClick={onEdit}
        >
          <i aria-hidden="true" className="bi bi-pencil" />
          {t("Editar meta")}
        </button>
        <button
          type="button"
          popoverTarget={id}
          popoverTargetAction="hide"
          onClick={onDelete}
          className="goal-delete-action"
        >
          <i aria-hidden="true" className="bi bi-trash3" />
          {t("Eliminar meta")}
        </button>
      </div>
    </>
  );
}

export function GoalDiagramZoomControls({
  id,
  zoom,
  setZoom,
  onReset,
  onFit,
  onExpandAll,
  onCollapseAll,
}: {
  id: string;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  onReset: () => void;
  onFit: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  const { t } = useLanguage();
  const popover = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div
        className="goal-canvas-tools"
        role="group"
        aria-label={t("Herramientas del lienzo")}
      >
        <TooltipButton
          aria-label={t("Alejar")}
          disabled={zoom <= 0.35}
          onClick={() => setZoom((value) => Math.max(0.35, value - 0.1))}
        >
          <i aria-hidden="true" className="bi bi-dash-lg" />
        </TooltipButton>
        <TooltipButton
          ref={trigger}
          aria-label={t("Cambiar porcentaje de zoom")}
          aria-haspopup="dialog"
          popoverTarget={id}
          className="min-w-12 text-white"
        >
          {Math.round(zoom * 100)}%
        </TooltipButton>
        <TooltipButton
          aria-label={t("Acercar")}
          disabled={zoom >= 2}
          onClick={() => setZoom((value) => Math.min(2, value + 0.1))}
        >
          <i aria-hidden="true" className="bi bi-plus-lg" />
        </TooltipButton>
        <TooltipButton aria-label={t("Centrar")} onClick={onReset}>
          <i aria-hidden="true" className="bi bi-crosshair" />
        </TooltipButton>
        <TooltipButton aria-label={t("Ajustar a pantalla")} onClick={onFit}>
          <i aria-hidden="true" className="bi bi-fullscreen" />
        </TooltipButton>
        <TooltipButton aria-label={t("Expandir metas")} onClick={onExpandAll}>
          <i aria-hidden="true" className="bi bi-arrows-expand" />
        </TooltipButton>
        <TooltipButton aria-label={t("Contraer metas")} onClick={onCollapseAll}>
          <i aria-hidden="true" className="bi bi-arrows-collapse" />
        </TooltipButton>
      </div>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={t("Porcentaje de zoom")}
        className="goal-zoom-popover"
        onToggle={(event) => {
          if (event.newState === "open" && input.current) {
            input.current.value = String(Math.round(zoom * 100));
            input.current.focus();
            input.current.select();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            popover.current?.hidePopover();
            trigger.current?.focus();
          }
        }}
      >
        <h2>{t("Zoom del lienzo")}</h2>
        <div className="goal-zoom-presets">
          {[50, 75, 100, 125, 150, 200].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={Math.round(zoom * 100) === value}
              onClick={() => {
                setZoom(value / 100);
                popover.current?.hidePopover();
                trigger.current?.focus();
              }}
            >
              {value}%
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const value = input.current!.valueAsNumber;
            if (!Number.isFinite(value) || value < 35 || value > 200) return;
            setZoom(value / 100);
            popover.current?.hidePopover();
            trigger.current?.focus();
          }}
        >
          <label htmlFor={`${id}-value`}>{t("Personalizado")}</label>
          <div>
            <input
              ref={input}
              id={`${id}-value`}
              type="number"
              min="35"
              max="200"
              step="1"
              required
              aria-describedby={`${id}-hint`}
            />
            <span>%</span>
            <TooltipButton
              type="submit"
              aria-label={t("Aplicar zoom")}
              title={t("Aplicar (Enter)")}
            >
              <i aria-hidden="true" className="bi bi-check-lg" />
            </TooltipButton>
          </div>
          <p id={`${id}-hint`}>{t("Entre 35 % y 200 %")}</p>
        </form>
      </div>
    </>
  );
}
