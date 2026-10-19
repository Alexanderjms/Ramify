import {
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { type GoalActivity } from "@/lib/goal-activities";
import { ActivityStatus } from "./activity-status";
import Tooltip from "@/components/tooltip";
import ValidatedForm from "@/components/validated-form";

export type DiagramNode = {
  activity: GoalActivity;
  x: number;
  y: number;
  parentX: number;
  parentId: string;
  order: number;
  total: number;
};

export type Reordering = {
  id: string;
  target: string;
  offset: number;
} | null;

export default function GoalDiagramNode({
  node: { activity, x, y, parentId, order, total },
  nodes,
  collapsed,
  creating,
  zoom,
  reordering,
  reorderStart,
  setReordering,
  viewport,
  onReorderStart,
  language,
  t,
  onToggle,
  onSelect,
  onCreate,
  onMove,
  onCloseEditor,
  addButton,
}: {
  node: DiagramNode;
  nodes: DiagramNode[];
  collapsed: Set<string>;
  creating: string | null;
  zoom: number;
  reordering: Reordering;
  reorderStart: RefObject<number>;
  setReordering: Dispatch<SetStateAction<Reordering>>;
  viewport: RefObject<HTMLDivElement | null>;
  onReorderStart: (clientY: number) => void;
  language: string;
  t: (text: string) => string;
  onToggle: (id: string) => void;
  onSelect: (activity: GoalActivity, source: HTMLElement) => void;
  onCreate: (parent: string, name: string) => boolean;
  onMove: (parent: string, id: string, target: string) => void;
  onCloseEditor: (animate?: boolean) => void;
  addButton: (parent: string, name: string) => ReactNode;
}) {
  return (
    <div
      className="goal-node-label"
      data-draft={!activity.id || undefined}
      data-activity-id={activity.id || undefined}
      data-reordering={reordering?.id === activity.id || undefined}
      data-drop-position={
        reordering?.target === activity.id && reordering.id !== activity.id
          ? nodes.find((node) => node.activity.id === reordering.id)!.order <
            order
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
        <ValidatedForm
          className="goal-inline-create"
          aria-label={t("Crear meta")}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onCloseEditor(false);
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem(
              "name",
            ) as HTMLInputElement;
            if (creating !== null && onCreate(creating, input.value))
              onCloseEditor(false);
          }}
        >
          <input
            key={creating}
            name="name"
            aria-label={t("Nombre de la nueva meta")}
            placeholder={t("Nombre de la meta")}
            required
            pattern={".*\\S.*"}
            maxLength={100}
            autoFocus
            onFocus={(event) =>
              event.currentTarget.closest("form")?.scrollIntoView({
                block: "nearest",
                inline: "nearest",
              })
            }
          />
          <button type="submit" aria-label={t("Guardar meta")}>
            <i aria-hidden="true" className="bi bi-check-lg" />
          </button>
          <button
            type="button"
            aria-label={t("Cancelar meta")}
            onClick={() => onCloseEditor()}
          >
            <i aria-hidden="true" className="bi bi-x-lg" />
          </button>
        </ValidatedForm>
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
              aria-label={
                language === "en"
                  ? `${collapsed.has(activity.id) ? "Expand" : "Collapse"} goal ${activity.name}`
                  : `${collapsed.has(activity.id) ? "Expandir" : "Contraer"} meta ${activity.name}`
              }
              aria-expanded={!collapsed.has(activity.id)}
              onClick={() => {
                if (creating === activity.id) onCloseEditor();
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
            <Tooltip
              content={t(
                activity.status === "completed" ? "Completada" : "En proceso",
              )}
            >
              <span
                className="goal-status-indicator"
                role="img"
                aria-label={t(
                  activity.status === "completed" ? "Completada" : "En proceso",
                )}
                tabIndex={0}
              >
                <ActivityStatus status={activity.status} />
              </span>
            </Tooltip>
          )}
          {addButton(activity.id, activity.name)}
          {total > 1 && (
            <button
              type="button"
              className="goal-reorder"
              aria-label={`${language === "en" ? "Reorder goal" : "Reordenar meta"} ${activity.name}`}
              aria-pressed={reordering?.id === activity.id}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setReordering(null);
                  return;
                }
                if (event.key !== "ArrowUp" && event.key !== "ArrowDown")
                  return;
                event.preventDefault();
                const siblings = nodes.filter(
                  (node) => node.parentId === parentId && node.activity.id,
                );
                const target =
                  siblings[order + (event.key === "ArrowUp" ? -1 : 1)];
                if (target) onMove(parentId, activity.id, target.activity.id);
              }}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                onReorderStart(event.clientY);
                setReordering({
                  id: activity.id,
                  target: activity.id,
                  offset: 0,
                });
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId))
                  return;
                event.stopPropagation();
                const bounds = viewport
                  .current!.querySelector(".goal-diagram-content")!
                  .getBoundingClientRect();
                const pointerY = (event.clientY - bounds.top) / zoom;
                const siblings = nodes.filter(
                  (node) => node.parentId === parentId && node.activity.id,
                );
                const target = siblings.reduce((nearest, node) =>
                  Math.abs(node.y - pointerY) < Math.abs(nearest.y - pointerY)
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
  );
}
