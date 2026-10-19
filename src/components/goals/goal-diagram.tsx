"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { GoalView } from "@/lib/goal-view";
import { type GoalActivity } from "@/lib/goal-activities";
import { useLanguage } from "@/components/language-provider";
import GoalDiagramCanvas from "./goal-diagram-canvas";
import {
  GoalDiagramSettings,
  GoalDiagramZoomControls,
} from "./goal-diagram-controls";
import { type DiagramNode } from "./goal-diagram-node";
import GoalContextMenu, { type DiagramContext } from "./goal-context-menu";

export { ActivityStatus } from "./activity-status";

export default function GoalDiagram({
  view,
  onViewChange,
  onScroll,
  onEditGoal,
  onDeleteGoal,
  onDeleteBranch,
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
  view: GoalView;
  onViewChange: Dispatch<SetStateAction<GoalView>>;
  onScroll: (left: number, top: number) => void;
  onEditGoal: () => void;
  onDeleteGoal: () => void;
  onDeleteBranch: (id: string) => void;
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
  const zoom = view.zoom;
  const setZoom = useCallback<Dispatch<SetStateAction<number>>>(
    (value) => {
      onViewChange((previous) => ({
        ...previous,
        zoom: typeof value === "function" ? value(previous.zoom) : value,
      }));
    },
    [onViewChange],
  );
  const initialScroll = useRef({ left: view.scrollLeft, top: view.scrollTop });
  const zoomId = useId();
  const [creating, setCreating] = useState<string | null>(null);
  const createTrigger = useRef<HTMLButtonElement | null>(null);
  const closingEditor = useRef<Animation[]>([]);
  useEffect(
    () => () =>
      closingEditor.current.forEach((animation) => animation.cancel()),
    [],
  );
  const settingsId = useId();
  const [context, setContext] = useState<DiagramContext | null>(null);
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
    const frame = requestAnimationFrame(() =>
      viewport.current?.scrollTo(initialScroll.current),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

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
  }, [setZoom]);

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

  function closeEditor(animate = true, saved = false) {
    if (closingEditor.current.length) return;
    const finish = () => {
      setCreating(null);
      if (!saved)
        requestAnimationFrame(() =>
          createTrigger.current?.focus({ preventScroll: true }),
        );
    };
    if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    const elements = viewport.current?.querySelectorAll<
      HTMLElement | SVGElement
    >("[data-draft]");
    if (!elements?.length) {
      finish();
      return;
    }
    const easing = getComputedStyle(viewport.current!)
      .getPropertyValue("--ease-out")
      .trim();
    const animations = Array.from(elements, (element) => {
      const style = getComputedStyle(element);
      return element.animate(
        element instanceof SVGPathElement
          ? [
              { strokeDashoffset: style.strokeDashoffset },
              { strokeDashoffset: 1 },
            ]
          : [
              { opacity: style.opacity, transform: style.transform },
              { opacity: 0, transform: "translateY(-3px) scale(0.97)" },
            ],
        { duration: 180, easing, fill: "forwards" },
      );
    });
    closingEditor.current = animations;
    void Promise.all(animations.map((animation) => animation.finished))
      .then(() => {
        if (closingEditor.current !== animations) return;
        closingEditor.current = [];
        finish();
      })
      .catch(() => {});
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
        aria-expanded={creating === parent}
        onClick={(event) => {
          createTrigger.current = event.currentTarget;
          if (closingEditor.current.length) {
            closingEditor.current.forEach((animation) => animation.cancel());
            closingEditor.current = [];
            setCreating(parent);
            return;
          }
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
    <div
      className="goal-canvas-wrapper"
      onContextMenu={(event) => {
        const target = event.target as Element;
        if (
          target.closest(
            "input, textarea, [contenteditable], .goal-context-menu, [popover]:popover-open",
          )
        )
          return;
        event.preventDefault();
        const activityId = target
          .closest("[data-activity-id]")
          ?.getAttribute("data-activity-id");
        const activity = nodes.find(
          (node) => node.activity.id === activityId,
        )?.activity;
        const source =
          activity &&
          viewport.current?.querySelector<HTMLElement>(
            `.goal-node-label[data-activity-id="${CSS.escape(activity.id)}"]`,
          );
        setContext({
          x: event.clientX,
          y: event.clientY,
          activity,
          source: source || viewport.current!,
        });
      }}
      onKeyDown={(event) => {
        if (
          event.key !== "ContextMenu" &&
          !(event.shiftKey && event.key === "F10")
        )
          return;
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, [contenteditable]")) return;
        event.preventDefault();
        const bounds = target.getBoundingClientRect();
        target.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: bounds.left + 16,
            clientY: bounds.top + Math.min(bounds.height, 32),
          }),
        );
      }}
    >
      {!!activities.length && (
        <div className="goal-create-action">{addButton("", "la meta")}</div>
      )}
      <GoalDiagramSettings
        id={settingsId}
        onEdit={onEditGoal}
        onDelete={onDeleteGoal}
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
        onScroll={onScroll}
        onToggle={onToggle}
        onSelect={onSelect}
        onCreate={onCreate}
        onMove={onMove}
        onColor={onColor}
        onCloseEditor={closeEditor}
        addButton={addButton}
      />
      {!!activities.length && (
        <GoalDiagramZoomControls
          id={zoomId}
          zoom={zoom}
          setZoom={setZoom}
          onReset={reset}
          onFit={fit}
          onExpandAll={onExpandAll}
          onCollapseAll={collapseAll}
        />
      )}
      <GoalContextMenu
        context={context}
        onClose={() => setContext(null)}
        onCreate={() => {
          if (!activities.length) {
            viewport.current?.querySelector<HTMLInputElement>("input")?.focus();
            return;
          }
          createTrigger.current =
            viewport.current?.parentElement?.querySelector<HTMLButtonElement>(
              ".goal-create-action button",
            ) ?? null;
          setCreating("");
        }}
        onReset={reset}
        onFit={fit}
        onEdit={() => {
          if (context?.activity) onSelect(context.activity, context.source);
        }}
        onDelete={() => {
          if (!context?.activity) return;
          setCreating(null);
          onDeleteBranch(context.activity.id);
        }}
      />
    </div>
  );
}
