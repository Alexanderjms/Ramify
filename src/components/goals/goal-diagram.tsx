"use client";

import { useEffect, useId, useRef, useState } from "react";
import { type GoalActivity } from "@/lib/goal-activities";
import { useLanguage } from "@/components/language-provider";
import GoalDiagramCanvas from "./goal-diagram-canvas";
import {
  GoalDiagramSettings,
  GoalDiagramZoomControls,
} from "./goal-diagram-controls";
import { type DiagramNode } from "./goal-diagram-node";

export { ActivityStatus } from "./activity-status";

export default function GoalDiagram({
  activities,
  collapsed,
  onToggle,
  onSelect,
  onCreate,
  onMove,
  onColor,
  onCollapseAll,
  onExpandAll,
}: {
  activities: GoalActivity[];
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (activity: GoalActivity, source: HTMLElement) => void;
  onCreate: (parent: string, name: string) => boolean;
  onMove: (parent: string, id: string, target: string) => void;
  onColor: (id: string, color: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const [zoom, setZoom] = useState(1);
  const zoomId = useId();
  const [creating, setCreating] = useState<string | null>(null);
  const createTrigger = useRef<HTMLButtonElement | null>(null);
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
        ? [
            ...items,
            { id: "", name: "", color, status: "pending" } as GoalActivity,
          ]
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
  const trunkEnd =
    (nodes.filter((node) => node.parentX === 66).at(-1)?.y ?? 136) - 48;
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
        Math.max(0.35, Math.min(2, value - Math.sign(event.deltaY) * 0.1)),
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
        aria-label={
          language === "en"
            ? `Add goal to ${parent ? name : "goal"}`
            : `Añadir meta a ${name}`
        }
        title={
          language === "en"
            ? `Add goal to ${parent ? name : "goal"}`
            : `Añadir meta a ${name}`
        }
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
        {parent === "" && <span>{t("Nueva meta")}</span>}
      </button>
    );
  }

  return (
    <div className="goal-canvas-wrapper">
      <div className="goal-create-action">{addButton("", "la meta")}</div>
      <GoalDiagramSettings
        id={settingsId}
        onReset={reset}
        onFit={fit}
        onExpandAll={onExpandAll}
        onCollapseAll={collapseAll}
      />
      <GoalDiagramCanvas
        activities={activities}
        collapsed={collapsed}
        creating={creating}
        nodes={nodes}
        zoom={zoom}
        width={width}
        height={height}
        trunkEnd={trunkEnd}
        gradientId={settingsId}
        viewport={viewport}
        onToggle={onToggle}
        onSelect={onSelect}
        onCreate={onCreate}
        onMove={onMove}
        onColor={onColor}
        onCloseEditor={closeEditor}
        addButton={addButton}
      />
      <GoalDiagramZoomControls
        id={zoomId}
        zoom={zoom}
        setZoom={setZoom}
        onReset={reset}
        onFit={fit}
        onExpandAll={onExpandAll}
        onCollapseAll={collapseAll}
      />
    </div>
  );
}
