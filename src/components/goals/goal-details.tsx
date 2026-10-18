"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { GoalView } from "@/lib/goal-view";
import useGoalView from "./use-goal-view";
import NewGoalModal from "./new-goal-modal";
import DeleteGoalDialog from "./delete-goal-dialog";
import {
  flattenActivities,
  colorActivity,
  mapActivities,
  type GoalActivity,
} from "@/lib/goal-activities";
import { useGoals } from "./goals-provider";
import GoalDiagram from "./goal-diagram";
import BranchDetails from "./branch-details";
import { GoalDiagramSkeleton } from "./goal-loading-skeleton";
import { useLanguage } from "@/components/language-provider";
import "./goal-details.css";

export default function GoalDetails({
  id,
  initialView,
}: {
  id: string;
  initialView: GoalView;
}) {
  const {
    goals,
    loading,
    updateActivities,
    updateGoal,
    deleteGoal,
    deleteBranch,
  } = useGoals();
  const router = useRouter();
  const editDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const deleteBranchDialog = useRef<HTMLDialogElement>(null);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const { t } = useLanguage();
  const goal = goals.find((goal) => goal.id === id);
  const {
    view,
    setView,
    updateScroll,
    saveError,
    retrySave,
    loadError,
    retryLoad,
    pauseSaving,
    resumeSaving,
  } = useGoalView(id, initialView);
  const collapsed = useMemo(() => new Set(view.collapsed), [view.collapsed]);
  function setCollapsed(
    value: Set<string> | ((previous: Set<string>) => Set<string>),
  ) {
    setView((previous) => ({
      ...previous,
      collapsed: [
        ...(typeof value === "function"
          ? value(new Set(previous.collapsed))
          : value),
      ],
    }));
  }
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
              children: [...(activity.children ?? []), item],
            }))
          : [...current, item],
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

  if (!goal && loading) return <GoalDiagramSkeleton />;
  if (!goal)
    return (
      <div className="p-8">
        <Link href="/metas" className="text-xs text-zinc-400">
          ← {t("Metas")}
        </Link>
        <h1 className="mt-6 text-xl font-semibold">
          {t("Meta no encontrada")}
        </h1>
      </div>
    );

  return (
    <div className="goal-detail">
      {saveError && (
        <p role="alert" className="px-5 py-2 text-xs text-red-400 sm:px-8">
          {t("No se pudo guardar la vista en Turso.")}{" "}
          <button type="button" onClick={retrySave} className="underline">
            {t("Reintentar")}
          </button>
        </p>
      )}
      {loadError && (
        <p role="alert" className="px-5 py-2 text-xs text-red-400 sm:px-8">
          {t("No se pudo cargar la vista en Turso.")}{" "}
          <button
            type="button"
            onClick={() => void retryLoad()}
            className="underline"
          >
            {t("Reintentar")}
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="px-5 py-2 text-xs text-red-400 sm:px-8">
          {t(error)}
        </p>
      )}
      <GoalDiagram
        onDeleteBranch={(activityId) => {
          setDeletingBranchId(activityId);
          deleteBranchDialog.current?.showModal();
        }}
        onEditGoal={() => editDialog.current?.showModal()}
        onDeleteGoal={() => deleteDialog.current?.showModal()}
        view={view}
        onViewChange={setView}
        onScroll={updateScroll}
        onColor={(activityId, color) =>
          save((current) =>
            mapActivities(current, activityId, (item) =>
              colorActivity(item, color),
            ),
          )
        }
        activities={activities}
        collapsed={collapsed}
        onToggle={toggle}
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
            mapActivities(current, activityId, (item) => {
              const patch =
                typeof changes === "function" ? changes(item) : changes;
              const next = { ...item, ...patch };
              return patch.color ? colorActivity(next, patch.color) : next;
            }),
          )
        }
      />
      <NewGoalModal
        dialogRef={editDialog}
        initialGoal={goal}
        onCreate={(changes) => updateGoal(id, changes)}
      />
      <DeleteGoalDialog
        dialogRef={deleteDialog}
        name={goal.name}
        onDelete={async () => {
          await pauseSaving();
          try {
            await deleteGoal(id);
          } catch (error) {
            resumeSaving();
            throw error;
          }
          router.replace("/metas");
        }}
      />
      <DeleteGoalDialog
        branch
        dialogRef={deleteBranchDialog}
        name={
          all.find((activity) => activity.id === deletingBranchId)?.name ?? ""
        }
        onDelete={() => {
          if (!deletingBranchId) throw new Error("Branch not found");
          const removed = new Set(deleteBranch(id, deletingBranchId));
          setCollapsed(
            (previous) =>
              new Set(
                [...previous].filter((activityId) => !removed.has(activityId)),
              ),
          );
          if (selectedId && removed.has(selectedId)) {
            detailsDialog.current?.close();
            setSelectedId(null);
            setSelectedSource(null);
          }
          setDeletingBranchId(null);
        }}
      />
    </div>
  );
}
