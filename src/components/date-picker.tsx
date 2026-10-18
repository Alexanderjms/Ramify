"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import Select from "./select";
import "./date-picker.css";

function localDate(year: number, month: number, day: number) {
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
}

function dateValue(date: Date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = localDate(year, month - 1, day);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    year >= 1 &&
    year <= 9999 &&
    dateValue(date) === value
    ? date
    : null;
}

const months = Array.from({ length: 12 }, (_, month) => ({
  value: String(month),
  label: new Intl.DateTimeFormat("es", { month: "long" }).format(
    localDate(2026, month, 1),
  ),
}));
const weekdays = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];
const fullDate = new Intl.DateTimeFormat("es", { dateStyle: "full" });
const shortDate = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => boolean | void;
}) {
  const id = useId();
  const anchor = `--date-${id.replace(/[^a-z0-9]/gi, "")}`;
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(() => value || dateValue(new Date()));
  const [month, setMonth] = useState(() => {
    const date = parseDate(value) ?? new Date();
    return localDate(date.getFullYear(), date.getMonth(), 1);
  });
  const selected = parseDate(value);
  const today = dateValue(new Date());
  const year = month.getFullYear();
  const firstDay = (month.getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, index) =>
    localDate(year, month.getMonth(), index - firstDay + 1),
  );
  const years = Array.from(
    { length: Math.min(9999, year + 100) - Math.max(1, year - 100) + 1 },
    (_, index) => {
      const label = String(Math.max(1, year - 100) + index);
      return { value: label, label };
    },
  );

  function focusDay(date: Date) {
    if (date.getFullYear() < 1 || date.getFullYear() > 9999) return;
    const next = dateValue(date);
    setFocused(next);
    setMonth(localDate(date.getFullYear(), date.getMonth(), 1));
    requestAnimationFrame(() =>
      popover.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)
        ?.focus({ preventScroll: true }),
    );
  }

  function changeMonth(year: number, month: number) {
    const date = localDate(year, month, 1);
    if (date.getFullYear() < 1 || date.getFullYear() > 9999) return;
    setMonth(date);
    setFocused(dateValue(date));
  }

  function close() {
    popover.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }

  function choose(next: string) {
    if (onChange(next) !== false) close();
  }

  function dayKey(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    const next = new Date(date);
    if (event.key === "ArrowLeft") next.setDate(next.getDate() - 1);
    else if (event.key === "ArrowRight") next.setDate(next.getDate() + 1);
    else if (event.key === "ArrowUp") next.setDate(next.getDate() - 7);
    else if (event.key === "ArrowDown") next.setDate(next.getDate() + 7);
    else if (event.key === "Home")
      next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
    else if (event.key === "End")
      next.setDate(next.getDate() + 6 - ((next.getDay() + 6) % 7));
    else if (event.key === "PageUp" || event.key === "PageDown") {
      const day = next.getDate();
      next.setDate(1);
      next.setMonth(
        next.getMonth() +
          (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1),
      );
      next.setDate(
        Math.min(
          day,
          localDate(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
        ),
      );
    } else return;
    event.preventDefault();
    focusDay(next);
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="date-picker-trigger"
        style={{ anchorName: anchor }}
        aria-label={`${label}: ${selected ? shortDate.format(selected) : "Sin fecha"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        popoverTarget={id}
      >
        <i aria-hidden="true" className="bi bi-calendar3" />
        <span>{selected ? shortDate.format(selected) : "Sin fecha"}</span>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={`Elegir ${label.toLocaleLowerCase("es")}`}
        className="calendar-popover"
        style={{ positionAnchor: anchor }}
        onToggle={(event) => {
          const isOpen = event.newState === "open";
          setOpen(isOpen);
          if (isOpen) focusDay(parseDate(value) ?? new Date());
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        }}
      >
        <div className="calendar-heading">
          <Select
            label="Mes"
            value={String(month.getMonth())}
            options={months}
            onChange={(value) => changeMonth(year, Number(value))}
          />
          <Select
            label="Año"
            value={String(year)}
            options={years}
            onChange={(value) => changeMonth(Number(value), month.getMonth())}
          />
          <div className="calendar-navigation">
            <button
              type="button"
              aria-label="Mes anterior"
              disabled={year === 1 && month.getMonth() === 0}
              onClick={() => changeMonth(year, month.getMonth() - 1)}
            >
              <i aria-hidden="true" className="bi bi-chevron-left" />
            </button>
            <button
              type="button"
              aria-label="Mes siguiente"
              disabled={year === 9999 && month.getMonth() === 11}
              onClick={() => changeMonth(year, month.getMonth() + 1)}
            >
              <i aria-hidden="true" className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {months[month.getMonth()].label} de {year}
        </p>
        <table
          role="grid"
          aria-label={`${months[month.getMonth()].label} de ${year}`}
          className="calendar-grid"
        >
          <thead>
            <tr>
              {weekdays.map((day) => (
                <th key={day} scope="col" abbr={day}>
                  {day.slice(0, 2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, week) => (
              <tr key={week}>
                {days.slice(week * 7, week * 7 + 7).map((date) => {
                  const iso = dateValue(date);
                  const available =
                    date.getFullYear() >= 1 && date.getFullYear() <= 9999;
                  return (
                    <td key={iso} aria-selected={value === iso}>
                      {available && (
                        <button
                          type="button"
                          data-date={iso}
                          data-selected={value === iso || undefined}
                          data-today={today === iso || undefined}
                          data-outside={
                            date.getMonth() !== month.getMonth() || undefined
                          }
                          tabIndex={focused === iso ? 0 : -1}
                          aria-label={fullDate.format(date)}
                          aria-current={today === iso ? "date" : undefined}
                          onFocus={() => setFocused(iso)}
                          onKeyDown={(event) => dayKey(event, date)}
                          onClick={() => choose(iso)}
                        >
                          {date.getDate()}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="calendar-footer">
          <button type="button" onClick={() => choose(today)}>
            Hoy
          </button>
          <button type="button" disabled={!value} onClick={() => choose("")}>
            Quitar fecha
          </button>
        </div>
      </div>
    </>
  );
}
