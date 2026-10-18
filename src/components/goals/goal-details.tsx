"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  flattenActivities,
  mapActivities,
  type GoalActivity,
} from "@/lib/goal-activities";
import { useGoals } from "./goals-provider";
import GoalDiagram from "./goal-diagram";
import BranchDetails from "./branch-details";
import "./goal-details.css";

export default function GoalDetails({ id }: { id: string }) {
  const { goals, updateActivities } = useGoals();
  const goal = goals.find((goal) => goal.id === id);
  const [collapsed, setCollapsed] = useState<Set<string>>(
    new Set(["modulo-1"]),
  );
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<HTMLElement | null>(
    null,
  );
  const detailsDialog = useRef<HTMLDialogElement>(null);
  const activities = goal?.activities ?? [];
  const all = flattenActivities(activities);
  const selected = all.find((item) => item.id === selectedId);

  function save(
    next: GoalActivity[] | ((current: GoalActivity[]) => GoalActivity[]),
  ) {
    try {
      updateActivities(id, next);
      setError("");
      return true;
    } catch {
      setError("No se pudieron guardar los cambios en este navegador.");
      return false;
    }
  }

  function toggle(activityId: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(activityId)) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
  }

  function cycleStatus(item: GoalActivity) {
    const status = item.status === "completed" ? "pending" : "completed";
    save((current) =>
      mapActivities(current, item.id, (activity) => ({ ...activity, status })),
    );
  }

  function addBranch(parent: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) return false;
    const color = all.find((item) => item.id === parent)?.color ?? "#3B82F6";
    const item: GoalActivity = {
      id: crypto.randomUUID(),
      name: trimmed,
      color,
      status: "pending",
    };
    if (
      !save((current) =>
        parent
          ? mapActivities(current, parent, (activity) => ({
              ...activity,
              children: [item, ...(activity.children ?? [])],
            }))
          : [item, ...current],
      )
    )
      return false;
    setCollapsed(
      (previous) => new Set([...previous].filter((value) => value !== parent)),
    );
    return true;
  }

  function moveBranch(parent: string, activityId: string, targetId: string) {
    save((current) => {
      const siblings = parent
        ? flattenActivities(current).find((item) => item.id === parent)
            ?.children
        : current;
      if (!siblings) return current;
      const index = siblings.findIndex((item) => item.id === activityId);
      const target = siblings.findIndex((item) => item.id === targetId);
      if (index < 0 || target < 0 || target === index) return current;
      const reordered = [...siblings];
      reordered.splice(target, 0, ...reordered.splice(index, 1));
      return parent
        ? mapActivities(current, parent, (item) => ({
            ...item,
            children: reordered,
          }))
        : reordered;
    });
  }

  if (!goal)
    return (
      <div className="p-8">
        <Link href="/metas" className="text-xs text-zinc-400">
          ← Goals
        </Link>
        <h1 className="mt-6 text-xl font-semibold">Meta no encontrada</h1>
      </div>
    );

  return (
    <div className="goal-detail">
      {error && (
        <p role="alert" className="px-5 py-2 text-xs text-red-400 sm:px-8">
          {error}
        </p>
      )}
      <GoalDiagram
        activities={activities}
        collapsed={collapsed}
        onToggle={toggle}
        onStatus={cycleStatus}
        onSelect={(activity, source) => {
          setSelectedId(activity.id);
          setSelectedSource(source);
          source.setAttribute("data-details-selected", "");
          if (!detailsDialog.current?.open) detailsDialog.current?.show();
        }}
        onCreate={addBranch}
        onMove={moveBranch}
        onCollapseAll={() =>
          setCollapsed(
            new Set(
              all
                .filter((item) => item.children?.length)
                .map((item) => item.id),
            ),
          )
        }
        onExpandAll={() => setCollapsed(new Set())}
      />
      <BranchDetails
        dialogRef={detailsDialog}
        activity={selected}
        source={selectedSource}
        onUpdate={(activityId, changes) =>
          save((current) =>
            mapActivities(current, activityId, (item) => ({
              ...item,
              ...changes,
            })),
          )
        }
        onCreate={addBranch}
      />
    </div>
  );
}
