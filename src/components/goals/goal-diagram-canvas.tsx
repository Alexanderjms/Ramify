import { useRef, useState, type RefObject } from "react";
import { type GoalActivity } from "@/lib/goal-activities";
import { useLanguage } from "@/components/language-provider";
import BranchColorPicker from "./branch-color-picker";
import GoalDiagramNode, {
  type DiagramNode,
  type Reordering,
} from "./goal-diagram-node";
import type { ReactNode } from "react";

export default function GoalDiagramCanvas({
  activities,
  collapsed,
  creating,
  nodes,
  zoom,
  width,
  height,
  trunkEnd,
  gradientId,
  viewport,
  onToggle,
  onSelect,
  onCreate,
  onMove,
  onColor,
  onCloseEditor,
  addButton,
}: {
  activities: GoalActivity[];
  collapsed: Set<string>;
  creating: string | null;
  nodes: DiagramNode[];
  zoom: number;
  width: number;
  height: number;
  trunkEnd: number;
  gradientId: string;
  viewport: RefObject<HTMLDivElement | null>;
  onToggle: (id: string) => void;
  onSelect: (activity: GoalActivity, source: HTMLElement) => void;
  onCreate: (parent: string, name: string) => boolean;
  onMove: (parent: string, id: string, target: string) => void;
  onColor: (id: string, color: string) => void;
  onCloseEditor: () => void;
  addButton: (parent: string, name: string) => ReactNode;
}) {
  const { t, language } = useLanguage();
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const [reordering, setReordering] = useState<Reordering>(null);
  const reorderStart = useRef(0);

  return (
    <div
      ref={viewport}
      className="goal-canvas app-scrollbar"
      role="region"
      aria-label={t("Diagrama de la meta")}
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
            <defs>
              <linearGradient
                id={`${gradientId}-trunk`}
                gradientUnits="userSpaceOnUse"
                x1="66"
                y1="-12"
                x2="66"
                y2={trunkEnd}
              >
                <stop offset="0" stopColor="#64748B" />
                {nodes
                  .filter((node) => node.parentX === 66)
                  .map((node) => (
                    <stop
                      key={node.activity.id}
                      offset={(node.y - 36) / (trunkEnd + 12)}
                      stopColor={node.activity.color}
                    />
                  ))}
                <stop
                  offset="1"
                  stopColor={
                    nodes.filter((node) => node.parentX === 66).at(-1)?.activity
                      .color ?? "#64748B"
                  }
                />
              </linearGradient>
            </defs>
            <path
              className="goal-root-connection"
              d={`M104 -12 C104 32,66 40,66 88 V${trunkEnd}`}
              stroke={`url(#${gradientId}-trunk)`}
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
            {nodes
              .filter((node) => !node.activity.id)
              .map((node) => (
                <circle
                  key={node.activity.id}
                  cx={node.x}
                  cy={node.y}
                  r="9"
                  fill={node.activity.color}
                />
              ))}
          </svg>
          {nodes
            .filter((node) => node.activity.id)
            .map(({ activity, x, y }) => (
              <div
                key={activity.id}
                className="goal-node-color"
                style={{ left: x - 14, top: y - 14 }}
              >
                <BranchColorPicker
                  name={activity.name}
                  color={activity.color}
                  onChange={(color) => onColor(activity.id, color)}
                />
              </div>
            ))}
          {nodes.map((node) => (
            <GoalDiagramNode
              key={node.activity.id}
              node={node}
              nodes={nodes}
              collapsed={collapsed}
              creating={creating}
              zoom={zoom}
              reordering={reordering}
              reorderStart={reorderStart}
              setReordering={setReordering}
              viewport={viewport}
              onReorderStart={(clientY) => {
                reorderStart.current = clientY;
              }}
              language={language}
              t={t}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreate={onCreate}
              onMove={onMove}
              onCloseEditor={onCloseEditor}
              addButton={addButton}
            />
          ))}
          {!activities.length && creating === null && (
            <p className="absolute left-[92px] top-24 max-w-64 text-xs leading-5 text-zinc-400">
              Pulsa Nueva meta junto a los ajustes para añadir tu primera meta.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
