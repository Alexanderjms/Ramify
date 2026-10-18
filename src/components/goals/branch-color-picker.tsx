"use client";

import { useId, useRef } from "react";
import { goalColors } from "./goal-colors";
import { useLanguage } from "@/components/language-provider";
import { TooltipButton } from "@/components/tooltip";
import "./branch-color-picker.css";

export default function BranchColorPicker({
  name,
  color,
  onChange,
}: {
  name: string;
  color: string;
  onChange: (color: string) => void;
}) {
  const id = useId();
  const { t, language } = useLanguage();
  const anchor = `--color-${id.replace(/[^a-z0-9]/gi, "")}`;
  const popup = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <TooltipButton
        ref={trigger}
        type="button"
        className="branch-color-trigger"
        aria-label={`${language === "en" ? "Change color of" : "Cambiar color de"} ${name}`}
        title={t("Cambiar color")}
        popoverTarget={id}
        style={{ anchorName: anchor }}
      >
        <span style={{ background: color }} />
      </TooltipButton>
      <div
        ref={popup}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={`${language === "en" ? "Color of" : "Color de"} ${name}`}
        className="branch-color-popover"
        style={{ positionAnchor: anchor }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            popup.current?.hidePopover();
            trigger.current?.focus();
          }
        }}
      >
        <h3>{t("Color de la meta")}</h3>
        <div className="branch-color-swatches">
          {goalColors.slice(0, 18).map(([label, value]) => (
            <TooltipButton
              type="button"
              key={value}
              title={t(label)}
              aria-label={t(label)}
              aria-pressed={color.toUpperCase() === value}
              onClick={() => {
                onChange(value);
                popup.current?.hidePopover();
                trigger.current?.focus({ preventScroll: true });
              }}
            >
              <span style={{ background: value }}>
                {color.toUpperCase() === value && (
                  <i aria-hidden="true" className="bi bi-check-lg" />
                )}
              </span>
            </TooltipButton>
          ))}
        </div>
        <label className="branch-custom-color">
          <span>{t("Color personalizado")}</span>
          <input
            type="color"
            aria-label={t("Color personalizado")}
            value={color}
            onChange={(event) =>
              onChange(event.currentTarget.value.toUpperCase())
            }
          />
        </label>
      </div>
    </>
  );
}
