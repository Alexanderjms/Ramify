"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import PaintHover from "@/components/paint-hover";
import Icon from "@/components/icon";
import "@/components/ui-motion.css";

export default function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  placeholder,
  chevron = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  icon?: ReactNode;
  placeholder?: string;
  chevron?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = options.findIndex((option) => option.value === value);

  useLayoutEffect(() => {
    const list = menu.current;
    const option = list?.children[active] as HTMLElement | undefined;
    if (open && list && option) {
      const top = option.offsetTop;
      const bottom = top + option.offsetHeight;
      if (!wasOpen.current)
        list.scrollTop = top - (list.clientHeight - option.offsetHeight) / 2;
      else if (top < list.scrollTop) list.scrollTop = top;
      else if (bottom > list.scrollTop + list.clientHeight)
        list.scrollTop = bottom - list.clientHeight;
    }
    wasOpen.current = open;
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "Escape" && open) {
      setOpen(false);
      event.preventDefault();
      return;
    }
    if (
      ["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)
    ) {
      event.preventDefault();
      if (!open) {
        setActive(Math.max(0, selected));
        setOpen(true);
      } else if (event.key === "Enter" || event.key === " ") choose(active);
      else if (event.key === "Home") setActive(0);
      else if (event.key === "End") setActive(options.length - 1);
      else
        setActive(
          (index) =>
            (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
            options.length,
        );
    } else if (event.key.length === 1) {
      const index = options.findIndex((option) =>
        option.label
          .toLocaleLowerCase("es")
          .startsWith(event.key.toLocaleLowerCase("es")),
      );
      if (index >= 0) {
        event.preventDefault();
        setActive(index);
        setOpen(true);
      }
    }
  }

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onKeyDown={onKeyDown}
        onClick={() => {
          setActive(Math.max(0, selected));
          setOpen(!open);
        }}
        className={`paint-hover flex min-h-9 cursor-pointer items-center gap-[7px] rounded border px-3 py-2 text-xs font-medium text-white ${open ? "border-zinc-600 bg-zinc-900" : "border-zinc-800 bg-black"}`}
      >
        <PaintHover>
          <span className="select-icon" data-chevron={chevron}>
            {icon}
          </span>
          <span key={value} className="select-label">
            {placeholder ?? options[selected]?.label}
          </span>
        </PaintHover>
      </button>
      <div
        ref={menu}
        id={`${id}-list`}
        role="listbox"
        aria-label={label}
        aria-hidden={!open}
        inert={!open}
        data-open={open}
        className="select-menu absolute left-0 top-full z-30 mt-2 min-w-full w-max max-w-[calc(100vw-6rem)] flex-col gap-[6px] rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-xl shadow-black/40"
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${id}-${index}`}
            role="option"
            aria-selected={value === option.value}
            onPointerMove={(event) => {
              if (event.pointerType === "mouse") setActive(index);
            }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(index)}
            className={`select-option flex min-h-9 cursor-pointer items-center justify-between gap-6 rounded px-3 py-2 text-xs ${active === index ? "bg-zinc-800" : value === option.value ? "bg-zinc-900" : ""} ${value === option.value ? "text-white" : "text-zinc-400"}`}
          >
            <span className="flex items-center gap-2">
              {option.icon}
              {option.label}
            </span>
            <Icon name="tick" className="select-check size-3.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
