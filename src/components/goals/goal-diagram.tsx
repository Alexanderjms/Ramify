"use client";

import { useEffect, useId, useRef, useState } from "react";
import { type GoalActivity } from "@/lib/goal-activities";

export function ActivityStatus({ status }: { status: GoalActivity["status"] }) {
  return (
    <i
      aria-hidden="true"
      className={`bi text-xs leading-none ${status === "completed" ? "bi-check-circle-fill text-green-500" : status === "progress" ? "bi-record-circle text-blue-500" : "bi-circle text-zinc-400"}`}
    />
  );
}

type DiagramNode = {
  activity: GoalActivity;
  x: number;
  y: number;
  parentX: number;
  parentId: string;
  order: number;
  total: number;
};

export default function GoalDiagram({
  activities,
  collapsed,
  onToggle,
  onSelect,
  onCreate,
  onMove,
  onCollapseAll,
  onExpandAll,
}: {
  activities: GoalActivity[];
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (activity: GoalActivity, source: HTMLElement) => void;
  onCreate: (parent: string, name: string) => boolean;
  onMove: (parent: string, id: string, target: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [creating, setCreating] = useState<string | null>(null);
  const createTrigger = useRef<HTMLButtonElement | null>(null);
  const reorderStart = useRef(0);
  const [reordering, setReordering] = useState<{
    id: string;
    target: string;
    offset: number;
  } | null>(null);
  const settingsId = useId();
  const nodes: DiagramNode[] = [];
  let cursor = 136;
  function layout(
    items: GoalActivity[],
    parentX: number,
    parentId: string,
    color = "#3B82F6",
  ) {
    const visible: GoalActivity[] =
      creating === parentId
        ? [{ id: "", name: "", color, status: "pending" }, ...items]
        : items;
    visible.forEach((activity, index) => {
      if (index) cursor += parentX === 66 ? 12 : 0;
      const node = {
        activity,
        x: parentX + 94,
        y: cursor,
        parentX,
        parentId,
        order: items.indexOf(activity),
        total: items.length,
      };
      nodes.push(node);
      cursor += 56;
      if (
        activity.id &&
        (creating === activity.id ||
          (activity.children?.length && !collapsed.has(activity.id)))
      ) {
        cursor += 12;
        layout(activity.children ?? [], node.x, activity.id, activity.color);
      }
    });
  }
  layout(activities, 66, "");
  const width = Math.max(
    700,
    ...nodes.map(
      (node) => node.x + Math.max(390, node.activity.name.length * 9 + 180),
    ),
  );
  const height = Math.max(420, cursor + 12);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    function wheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((value) =>
        Math.max(0.35, Math.min(2, value - event.deltaY * 0.002)),
      );
    }
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);

  function reset() {
    setZoom(1);
    viewport.current?.scrollTo({ left: 0, top: 0 });
  }

  function fit() {
    const element = viewport.current;
    if (element) {
      setZoom(
        Math.max(
          0.35,
          Math.min(
            1,
            (element.clientWidth - 32) / width,
            (element.clientHeight - 32) / height,
          ),
        ),
      );
      element.scrollTo({ left: 0, top: 0 });
    }
  }

  function collapseAll() {
    setCreating(null);
    onCollapseAll();
  }

  function closeEditor() {
    setCreating(null);
    requestAnimationFrame(() => createTrigger.current?.focus());
  }

  function addButton(parent: string, name: string) {
    return (
      <button
        className="goal-add-branch"
        aria-label={`Añadir meta a ${name}`}
        title={`Añadir meta a ${name}`}
        aria-expanded={creating === parent}
        onClick={(event) => {
          createTrigger.current = event.currentTarget;
          if (creating === parent) {
            closeEditor();
            return;
          }
          setCreating(parent);
          if (collapsed.has(parent)) onToggle(parent);
        }}
      >
        <i aria-hidden="true" className="bi bi-plus-lg" />
        {parent === "" && <span>Nueva meta</span>}
      </button>
    );
  }

  return (
    <div className="goal-canvas-wrapper">
      <div className="goal-create-action">{addButton("", "la meta")}</div>
      <button
        type="button"
        className="goal-settings-button"
        aria-label="Configuración de la vista"
        title="Configuración de la vista"
        popoverTarget={settingsId}
      >
        <i aria-hidden="true" className="bi bi-sliders2" />
      </button>
      <div
        id={settingsId}
        popover="auto"
        className="goal-settings-menu"
        aria-label="Configuración de la vista"
      >
        <h2 className="px-3 py-2 text-[11px] font-medium text-zinc-400">
          Configuración de la vista
        </h2>
        <button
          type="button"
          popoverTarget={settingsId}
          popoverTargetAction="hide"
          onClick={reset}
        >
          <i aria-hidden="true" className="bi bi-crosshair" />
          Centrar lienzo
        </button>
        <button
          type="button"
          popoverTarget={settingsId}
          popoverTargetAction="hide"
          onClick={fit}
        >
          <i aria-hidden="true" className="bi bi-fullscreen" />
          Ajustar a pantalla
        </button>
        <button
          type="button"
          popoverTarget={settingsId}
          popoverTargetAction="hide"
          onClick={onExpandAll}
        >
          <i aria-hidden="true" className="bi bi-arrows-expand" />
          Expandir todas las metas
        </button>
        <button
          type="button"
          popoverTarget={settingsId}
          popoverTargetAction="hide"
          onClick={collapseAll}
        >
          <i aria-hidden="true" className="bi bi-arrows-collapse" />
          Contraer todas las metas
        </button>
      </div>
      <div
        ref={viewport}
        className="goal-canvas app-scrollbar"
        role="region"
        aria-label="Diagrama de la meta"
        tabIndex={0}
        onPointerDown={(event) => {
          if (
            event.button !== 0 ||
            (event.target as HTMLElement).closest("button, input, form")
          )
            return;
          const element = event.currentTarget;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            left: element.scrollLeft,
            top: element.scrollTop,
          };
          element.setPointerCapture(event.pointerId);
          element.dataset.dragging = "true";
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          event.currentTarget.scrollLeft =
            drag.current.left - (event.clientX - drag.current.x);
          event.currentTarget.scrollTop =
            drag.current.top - (event.clientY - drag.current.y);
        }}
        onPointerUp={(event) => {
          drag.current = null;
          delete event.currentTarget.dataset.dragging;
        }}
        onPointerCancel={(event) => {
          drag.current = null;
          delete event.currentTarget.dataset.dragging;
        }}
      >
        <div style={{ width: width * zoom, height: height * zoom }}>
          <div
            className="goal-diagram-content"
            style={{ width, height, transform: `scale(${zoom})` }}
          >
            <svg
              width={width}
              height={height}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              fill="none"
              strokeLinecap="round"
            >
              <path
                className="goal-root-connection"
                d={`M104 -12 C104 32,66 40,66 88 V${height - 40}`}
                stroke="#64748B"
                strokeWidth="5"
              />
              {nodes.map((node) => (
                <path
                  key={node.activity.id}
                  d={`M${node.parentX} ${node.y - 48} C${node.parentX} ${node.y - 24},${node.x} ${node.y - 24},${node.x} ${node.y}`}
                  stroke={node.activity.color}
                  strokeWidth={node.parentX === 66 ? 5 : 4}
                />
              ))}
              {nodes
                .filter(
                  (node) =>
                    node.activity.id &&
                    (creating === node.activity.id ||
                      (node.activity.children?.length &&
                        !collapsed.has(node.activity.id))),
                )
                .map((node) => {
                  const children = nodes.filter(
                    (child) => child.parentId === node.activity.id,
                  );
                  return (
                    <path
                      key={node.activity.id}
                      d={`M${node.x} ${node.y} V${children.at(-1)!.y - 48}`}
                      stroke={node.activity.color}
                      strokeWidth="4"
                    />
                  );
                })}
              {nodes.map((node) => (
                <circle
                  key={node.activity.id}
                  cx={node.x}
                  cy={node.y}
                  r="9"
                  fill={node.activity.color}
                />
              ))}
            </svg>
            {nodes.map(({ activity, x, y, parentId, order, total }) => (
              <div
                key={activity.id}
                className="goal-node-label"
                data-reordering={reordering?.id === activity.id || undefined}
                data-drop-position={
                  reordering?.target === activity.id &&
                  reordering.id !== activity.id
                    ? nodes.find((node) => node.activity.id === reordering.id)!
                        .order < order
                      ? "after"
                      : "before"
                    : undefined
                }
                style={{
                  left: x + 26,
                  top: y - 15,
                  transform:
                    reordering?.id === activity.id
                      ? `translateY(${reordering.offset / zoom}px)`
                      : undefined,
                }}
              >
                {!activity.id ? (
                  <form
                    className="goal-inline-create"
                    aria-label="Crear meta"
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        event.stopPropagation();
                        closeEditor();
                      }
                    }}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const input = event.currentTarget.elements.namedItem(
                        "name",
                      ) as HTMLInputElement;
                      if (creating !== null && onCreate(creating, input.value))
                        closeEditor();
                    }}
                  >
                    <input
                      key={creating}
                      name="name"
                      aria-label="Nombre de la nueva meta"
                      placeholder="Nombre de la meta"
                      required
                      maxLength={100}
                      autoFocus
                      onFocus={(event) =>
                        event.currentTarget.closest("form")?.scrollIntoView({
                          block: "nearest",
                          inline: "nearest",
                        })
                      }
                      onInput={(event) =>
                        event.currentTarget.setCustomValidity(
                          event.currentTarget.value.trim()
                            ? ""
                            : "Escribe el nombre de la meta.",
                        )
                      }
                    />
                    <button
                      type="submit"
                      aria-label="Guardar meta"
                      title="Guardar (Enter)"
                    >
                      <i aria-hidden="true" className="bi bi-check-lg" />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancelar meta"
                      title="Cancelar (Escape)"
                      onClick={closeEditor}
                    >
                      <i aria-hidden="true" className="bi bi-x-lg" />
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      className="goal-node-title"
                      aria-haspopup="dialog"
                      onClick={(event) =>
                        onSelect(activity, event.currentTarget.parentElement!)
                      }
                    >
                      {activity.name}
                    </button>
                    {!!activity.children?.length && (
                      <button
                        className="goal-node-chevron"
                        aria-label={`${collapsed.has(activity.id) ? "Expandir" : "Contraer"} meta ${activity.name}`}
                        aria-expanded={!collapsed.has(activity.id)}
                        onClick={() => {
                          if (creating === activity.id) closeEditor();
                          onToggle(activity.id);
                        }}
                      >
                        <i
                          aria-hidden="true"
                          className={`bi bi-chevron-${collapsed.has(activity.id) ? "right" : "down"}`}
                        />
                      </button>
                    )}
                    {activity.status !== "pending" && (
                      <span
                        className="goal-status-indicator"
                        role="img"
                        aria-label={
                          activity.status === "completed"
                            ? "Completada"
                            : "En proceso"
                        }
                        title={
                          activity.status === "completed"
                            ? "Completada"
                            : "En proceso"
                        }
                      >
                        <ActivityStatus status={activity.status} />
                      </span>
                    )}
                    {addButton(activity.id, activity.name)}
                    {total > 1 && (
                      <button
                        type="button"
                        className="goal-reorder"
                        aria-label={`Reordenar meta ${activity.name}`}
                        title="Arrastra para ordenar. Con teclado: flechas arriba y abajo."
                        aria-pressed={reordering?.id === activity.id}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setReordering(null);
                            return;
                          }
                          if (
                            event.key !== "ArrowUp" &&
                            event.key !== "ArrowDown"
                          )
                            return;
                          event.preventDefault();
                          const siblings = nodes.filter(
                            (node) =>
                              node.parentId === parentId && node.activity.id,
                          );
                          const target =
                            siblings[
                              order + (event.key === "ArrowUp" ? -1 : 1)
                            ];
                          if (target)
                            onMove(parentId, activity.id, target.activity.id);
                        }}
                        onPointerDown={(event) => {
                          if (event.button !== 0) return;
                          event.stopPropagation();
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                          reorderStart.current = event.clientY;
                          setReordering({
                            id: activity.id,
                            target: activity.id,
                            offset: 0,
                          });
                        }}
                        onPointerMove={(event) => {
                          if (
                            !event.currentTarget.hasPointerCapture(
                              event.pointerId,
                            )
                          )
                            return;
                          event.stopPropagation();
                          const bounds = viewport
                            .current!.querySelector(".goal-diagram-content")!
                            .getBoundingClientRect();
                          const pointerY = (event.clientY - bounds.top) / zoom;
                          const siblings = nodes.filter(
                            (node) =>
                              node.parentId === parentId && node.activity.id,
                          );
                          const target = siblings.reduce((nearest, node) =>
                            Math.abs(node.y - pointerY) <
                            Math.abs(nearest.y - pointerY)
                              ? node
                              : nearest,
                          );
                          setReordering({
                            id: activity.id,
                            target: target.activity.id,
                            offset: event.clientY - reorderStart.current,
                          });
                        }}
                        onPointerUp={(event) => {
                          event.stopPropagation();
                          if (
                            reordering?.id === activity.id &&
                            Math.abs(reordering.offset) > 4
                          )
                            onMove(parentId, activity.id, reordering.target);
                          setReordering(null);
                        }}
                        onPointerCancel={() => setReordering(null)}
                        onLostPointerCapture={() => setReordering(null)}
                      >
                        <i aria-hidden="true" className="bi bi-grip-vertical" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            {!activities.length && creating === null && (
              <p className="absolute left-[92px] top-24 max-w-64 text-xs leading-5 text-zinc-400">
                Pulsa Nueva meta junto a los ajustes para añadir tu primera
                meta.
              </p>
            )}
          </div>
        </div>
      </div>
      <div
        className="goal-canvas-tools"
        role="group"
        aria-label="Herramientas del lienzo"
      >
        <button
          aria-label="Alejar"
          disabled={zoom <= 0.35}
          onClick={() => setZoom((value) => Math.max(0.35, value - 0.1))}
        >
          <i aria-hidden="true" className="bi bi-dash-lg" />
        </button>
        <button
          aria-label="Restablecer zoom"
          onClick={reset}
          className="min-w-12 text-white"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          aria-label="Acercar"
          disabled={zoom >= 2}
          onClick={() => setZoom((value) => Math.min(2, value + 0.1))}
        >
          <i aria-hidden="true" className="bi bi-plus-lg" />
        </button>
        <button aria-label="Centrar" onClick={reset}>
          <i aria-hidden="true" className="bi bi-crosshair" />
        </button>
        <button aria-label="Ajustar a pantalla" onClick={fit}>
          <i aria-hidden="true" className="bi bi-fullscreen" />
        </button>
        <button aria-label="Expandir metas" onClick={onExpandAll}>
          <i aria-hidden="true" className="bi bi-arrows-expand" />
        </button>
        <button aria-label="Contraer metas" onClick={collapseAll}>
          <i aria-hidden="true" className="bi bi-arrows-collapse" />
        </button>
      </div>
    </div>
  );
}
