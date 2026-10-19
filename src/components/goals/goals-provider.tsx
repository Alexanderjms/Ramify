"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import GoalsSyncNotifications from "./goals-sync-notifications";
import SyncConflictDialog, {
  type SyncConflictDialogHandle,
} from "./sync-conflict-dialog";
import type { Goal } from "@/lib/goals";
import {
  flattenActivities,
  isStoredGoalFile,
  removeActivity,
  validActivities,
  assertActivityLimits,
  type GoalActivity,
} from "@/lib/goal-activities";
import { migrateGoalFiles, removeGoalFile } from "@/lib/goal-files";
import { goalsStorageKey, parseGoals } from "@/lib/goal-storage";
import NewGoalModal from "./new-goal-modal";
import { ErrorToast } from "@/components/app-feedback";
import { InputError, errorMessage, responseError } from "@/lib/feedback";

type ActivityUpdate =
  GoalActivity[] | ((current: GoalActivity[]) => GoalActivity[]);
type GoalFields = Pick<Goal, "name" | "description" | "icon" | "color">;
type RemoteGoalsSnapshot = { goals: Goal[]; revision: number };
const GoalsContext = createContext<{
  userId: string;
  goals: Goal[];
  loading: boolean;
  openCreateGoal: () => void;
  updateActivities: (id: string, activities: ActivityUpdate) => void;
  updateGoal: (id: string, changes: GoalFields) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  deleteBranch: (goalId: string, activityId: string) => string[];
  syncErrors: Record<string, number>;
  retrySync: () => void;
  setFeedbackGoalId: (id: string | null) => void;
} | null>(null);

function subscribeGoals(key: string, callback: () => void) {
  try {
    if (localStorage.getItem(key) === null) {
      const legacyOwnerKey = `${goalsStorageKey}:legacy-owner`;
      const owner = localStorage.getItem(legacyOwnerKey);
      const legacy = localStorage.getItem(goalsStorageKey);
      if (legacy !== null && owner === key) {
        localStorage.setItem(key, legacy);
      } else localStorage.setItem(key, "[]");
    }
  } catch {}
  window.addEventListener("storage", callback);
  window.addEventListener("ramify:goals-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("ramify:goals-updated", callback);
  };
}

function readSnapshot(key: string) {
  try {
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

function writeGoals(key: string, goals: Goal[]) {
  const snapshot = JSON.stringify(goals);
  parseGoals(snapshot);
  if (localStorage.getItem(key) === snapshot) return;
  localStorage.setItem(key, snapshot);
  window.dispatchEvent(new Event("ramify:goals-updated"));
}

async function persistGoal(userId: string, id: string, changes?: GoalFields) {
  const response = await fetch(`/api/goals/${encodeURIComponent(id)}`, {
    method: changes ? "PUT" : "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Ramify-User-Id": userId,
    },
    body: changes ? JSON.stringify(changes) : undefined,
  });
  if (!response.ok) throw responseError(response);
}

function cleanupFiles(
  removed: GoalActivity[],
  remaining: Goal[],
  userId: string,
) {
  const retainedFiles = new Set(
    remaining.flatMap((goal) =>
      flattenActivities(goal.activities ?? []).flatMap((activity) =>
        (activity.resources ?? []).map((resource) => resource.url),
      ),
    ),
  );
  const files = new Set(
    flattenActivities(removed)
      .flatMap((activity) =>
        (activity.resources ?? []).map((resource) => resource.url),
      )
      .filter((url) => isStoredGoalFile(url) && !retainedFiles.has(url)),
  );
  void Promise.allSettled(
    [...files].map((url) => removeGoalFile(url, userId)),
  ).then((results) => {
    if (results.some((result) => result.status === "rejected"))
      console.warn("Some deleted attachments could not be cleaned up.");
  });
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (!context) throw new Error("GoalsProvider is required");
  return context;
}

export default function GoalsProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string;
}) {
  const revision = useRef(0);
  const storageKey = `${goalsStorageKey}:${userId}`;
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["goals", userId] as const, [userId]);
  const [metadataPendingCount, setMetadataPendingCount] = useState(0);
  const metadataPending = useRef(0);
  const beginMetadataMutation = useCallback(() => {
    metadataPending.current++;
    setMetadataPendingCount((count) => count + 1);
  }, []);
  const endMetadataMutation = useCallback(() => {
    metadataPending.current--;
    setMetadataPendingCount((count) => count - 1);
  }, []);
  const subscribe = useCallback(
    (callback: () => void) =>
      subscribeGoals(storageKey, () => {
        revision.current++;
        callback();
      }),
    [storageKey],
  );
  const getSnapshot = useCallback(() => readSnapshot(storageKey), [storageKey]);
  const storeGoals = useCallback(
    (goals: Goal[]) => writeGoals(storageKey, goals),
    [storageKey],
  );
  const remoteIdsKey = `${storageKey}:synced`;
  const rememberRemoteGoal = useCallback(
    (id: string) => {
      const ids = JSON.parse(
        localStorage.getItem(remoteIdsKey) ?? "[]",
      ) as string[];
      localStorage.setItem(
        remoteIdsKey,
        JSON.stringify([...new Set([...ids, id])]),
      );
    },
    [remoteIdsKey],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const goals = useMemo(() => {
    try {
      return parseGoals(snapshot);
    } catch {
      return [];
    }
  }, [snapshot]);
  const dialog = useRef<HTMLDialogElement>(null);
  const creationId = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncErrors, setSyncErrors] = useState<Record<string, number>>({});
  const [syncAttempt, setSyncAttempt] = useState(0);
  const [feedbackGoalId, setFeedbackGoalId] = useState<string | null>(null);
  const conflictDialog = useRef<SyncConflictDialogHandle>(null);
  const inFlight = useRef(new Map<string, Promise<void>>());
  const deleting = useRef(new Set<string>());
  const initialized = useRef(false);
  const active = useRef(true);
  const canRefreshGoals = useCallback(
    () =>
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      typeof navigator !== "undefined" &&
      navigator.onLine &&
      metadataPending.current === 0,
    [],
  );
  const goalsQuery = useQuery({
    queryKey,
    queryFn: async ({ signal }): Promise<RemoteGoalsSnapshot> => {
      const requestRevision = revision.current;
      const response = await fetch("/api/goals", {
        headers: { "X-Ramify-User-Id": userId },
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw responseError(response);
      return {
        goals: (await response.json()) as Goal[],
        revision: requestRevision,
      };
    },
    enabled: typeof window !== "undefined" && metadataPendingCount === 0,
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  const {
    data: remoteSnapshot,
    isError: goalsLoadError,
    refetch: refetchGoals,
  } = goalsQuery;
  const updateRemoteCache = useCallback(
    (
      revisionBeforeCommit: number,
      revisionAfterCommit: number,
      update: (remote: Goal[]) => Goal[],
    ) =>
      queryClient.setQueryData<RemoteGoalsSnapshot>(queryKey, (current) =>
        current
          ? {
              ...current,
              goals: update(current.goals),
              revision:
                current.revision === revisionBeforeCommit
                  ? revisionAfterCommit
                  : current.revision,
            }
          : current,
      ),
    [queryClient, queryKey],
  );
  const { mutateAsync: saveRemoteGoal } = useMutation({
    mutationKey: ["goals", userId, "save"],
    mutationFn: ({ id, changes }: { id: string; changes: GoalFields }) =>
      persistGoal(userId, id, changes),
    networkMode: "always",
    retry: false,
  });
  const { mutateAsync: deleteRemoteGoal } = useMutation({
    mutationKey: ["goals", userId, "delete"],
    mutationFn: (id: string) => persistGoal(userId, id),
    networkMode: "always",
    retry: false,
  });
  const { mutateAsync: saveActivitiesRemote } = useMutation({
    mutationKey: ["goals", userId, "activities"],
    mutationFn: async ({
      id,
      activities,
      version,
      goal,
    }: {
      id: string;
      activities: GoalActivity[];
      version: number;
      goal: Goal;
    }) => {
      const response = await fetch(
        `/api/goals/${encodeURIComponent(id)}/activities`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Ramify-User-Id": userId,
          },
          body: JSON.stringify({
            activities,
            version,
            goal: {
              name: goal.name,
              description: goal.description,
              icon: goal.icon,
              color: goal.color,
            },
          }),
        },
      );
      if (!response.ok) {
        const error = new Error("Could not synchronize diagram") as Error & {
          status: number;
        };
        error.status = response.status;
        throw error;
      }
      return (await response.json()) as { version: number };
    },
    networkMode: "always",
    retry: false,
  });

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const syncGoal = useCallback(
    (id: string) => {
      if (!active.current) return;
      if (inFlight.current.has(id) || deleting.current.has(id)) return;
      const source = parseGoals(getSnapshot()).find((goal) => goal.id === id);
      if (!source?.syncPending) return;
      const sourceTree = JSON.stringify(source.activities ?? []);
      const task = (async () => {
        try {
          const activities = source.activitiesInitialized
            ? (source.activities ?? [])
            : await migrateGoalFiles(source.activities ?? [], userId);
          if (!active.current || deleting.current.has(id)) return;
          const { version } = await saveActivitiesRemote({
            id,
            activities,
            version: source.activitiesVersion ?? 0,
            goal: { ...source, icon: source.icon ?? "flag-fill" },
          });
          if (!active.current) return;
          rememberRemoteGoal(id);
          const revisionBeforeCommit = revision.current;
          storeGoals(
            parseGoals(getSnapshot()).map((goal) => {
              if (goal.id !== id) return goal;
              const unchanged =
                JSON.stringify(goal.activities ?? []) === sourceTree;
              return {
                ...goal,
                activities: unchanged ? activities : goal.activities,
                activitiesVersion: version,
                activitiesInitialized:
                  unchanged || source.activitiesInitialized,
                syncPending: !unchanged,
              };
            }),
          );
          const revisionAfterCommit = revision.current;
          updateRemoteCache(
            revisionBeforeCommit,
            revisionAfterCommit,
            (remote) => {
              const saved = remote.find((goal) => goal.id === id);
              const now = Date.now();
              const synced = {
                ...(saved ?? {
                  id,
                  name: source.name,
                  description: source.description,
                  icon: source.icon ?? "flag-fill",
                  color: source.color,
                  progress: 0,
                  tasks: 0,
                  completedTasks: 0,
                }),
                activities,
                activitiesVersion: version,
                activitiesInitialized: true,
                activity: new Date(now).toISOString(),
                lastActivityAt: now,
              };
              return saved
                ? remote.map((goal) => (goal.id === id ? synced : goal))
                : [...remote, synced];
            },
          );
          setSyncErrors((errors) => {
            const next = { ...errors };
            delete next[id];
            return next;
          });
        } catch (error) {
          if (!active.current) return;
          const current = parseGoals(getSnapshot()).find(
            (goal) => goal.id === id,
          );
          if (!current || deleting.current.has(id)) return;
          if (JSON.stringify(current.activities ?? []) !== sourceTree)
            setSyncAttempt((attempt) => attempt + 1);
          else
            setSyncErrors((errors) => ({
              ...errors,
              [id]:
                (error as { status?: number }).status ??
                (error instanceof TypeError ? 0 : 500),
            }));
        } finally {
          inFlight.current.delete(id);
        }
      })();
      inFlight.current.set(id, task);
    },
    [
      getSnapshot,
      rememberRemoteGoal,
      storeGoals,
      saveActivitiesRemote,
      updateRemoteCache,
      userId,
    ],
  );

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      for (const goal of goals)
        if (goal.id && goal.syncPending && !syncErrors[goal.id])
          syncGoal(goal.id);
    }, 250);
    return () => clearTimeout(timer);
  }, [goals, loaded, syncGoal, syncErrors, syncAttempt]);

  useEffect(() => {
    const data = remoteSnapshot;
    if (!data) return;
    if (data.revision !== revision.current || metadataPending.current !== 0) {
      const retry = setTimeout(() => {
        if (canRefreshGoals() && !queryClient.isFetching({ queryKey }))
          void refetchGoals();
      }, 250);
      return () => clearTimeout(retry);
    }

    const current = parseGoals(getSnapshot());
    const remote = new Map(data.goals.map((goal) => [goal.id, goal]));
    const known = new Set(
      JSON.parse(localStorage.getItem(remoteIdsKey) ?? "[]") as string[],
    );
    const merged = current
      .filter(
        (goal) =>
          goal.syncPending || !known.has(goal.id!) || remote.has(goal.id!),
      )
      .map((goal) => {
        const saved = remote.get(goal.id!);
        if (goal.syncPending) return goal;
        if (!saved && !initialized.current)
          return { ...goal, syncPending: true };
        if (!saved) return goal;
        if (
          !initialized.current &&
          !saved.activitiesInitialized &&
          goal.activities?.length
        )
          return {
            ...goal,
            ...saved,
            activities: goal.activities,
            syncPending: true,
          };
        return { ...goal, ...saved, syncPending: false };
      });
    for (const goal of data.goals) {
      if (deleting.current.has(goal.id!)) continue;
      if (!current.some((item) => item.id === goal.id))
        merged.push({
          ...goal,
          activities: goal.activities ?? [],
          progress: 0,
          tasks: 0,
          completedTasks: 0,
        });
    }
    const normalized = parseGoals(JSON.stringify(merged));
    if (JSON.stringify(normalized) !== JSON.stringify(current))
      storeGoals(normalized);
    const remoteIds = JSON.stringify([
      ...new Set([...known, ...data.goals.map((goal) => goal.id)]),
    ]);
    if (localStorage.getItem(remoteIdsKey) !== remoteIds)
      localStorage.setItem(remoteIdsKey, remoteIds);
    if (!initialized.current) {
      initialized.current = true;
      setLoaded(true);
    }
    if (data.revision !== revision.current)
      queryClient.setQueryData<RemoteGoalsSnapshot>(queryKey, (cached) =>
        cached === data ? { ...cached, revision: revision.current } : cached,
      );
  }, [
    canRefreshGoals,
    getSnapshot,
    metadataPendingCount,
    queryClient,
    queryKey,
    remoteIdsKey,
    refetchGoals,
    remoteSnapshot,
    storeGoals,
  ]);

  useEffect(() => {
    const refresh = () => {
      if (!canRefreshGoals() || queryClient.isFetching({ queryKey })) return;
      void refetchGoals();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [canRefreshGoals, queryClient, queryKey, refetchGoals]);

  async function retrySync(overwrite = false) {
    const conflicts = Object.entries(syncErrors).filter(
      ([, status]) => status === 409,
    );
    if (conflicts.length && !overwrite) {
      conflictDialog.current?.open();
      return;
    }
    if (conflicts.length) {
      const { data, error } = await refetchGoals();
      if (error || !data) throw error ?? new Error("Could not load version");
      if (!active.current) return;
      const before = revision.current;
      storeGoals(
        parseGoals(getSnapshot()).map((goal) =>
          conflicts.some(([id]) => id === goal.id)
            ? {
                ...goal,
                activitiesVersion:
                  data.goals.find((item) => item.id === goal.id)
                    ?.activitiesVersion ?? goal.activitiesVersion,
              }
            : goal,
        ),
      );
      updateRemoteCache(before, revision.current, (remote) => remote);
    }
    setSyncErrors({});
    setSyncAttempt((attempt) => attempt + 1);
  }

  return (
    <GoalsContext
      value={{
        userId,
        goals,
        loading: !loaded,
        syncErrors,
        retrySync: () => {
          void retrySync();
        },
        setFeedbackGoalId,
        openCreateGoal: () => {
          creationId.current = null;
          dialog.current?.showModal();
        },
        updateGoal: async (id, changes) => {
          const current = parseGoals(getSnapshot());
          if (!current.some((goal) => goal.id === id))
            throw new Error("Goal not found");
          parseGoals(
            JSON.stringify(
              current.map((goal) =>
                goal.id === id ? { ...goal, ...changes } : goal,
              ),
            ),
          );
          beginMetadataMutation();
          let cacheCommit:
            { before: number; after: number; now: number } | undefined;
          try {
            await saveRemoteGoal({ id, changes });
            if (!active.current) return;
            rememberRemoteGoal(id);
            const now = Date.now();
            const before = revision.current;
            storeGoals(
              parseGoals(getSnapshot()).map((goal) =>
                goal.id === id
                  ? {
                      ...goal,
                      ...changes,
                      name: changes.name.trim(),
                      activity: "Ahora",
                      lastActivityAt: now,
                    }
                  : goal,
              ),
            );
            cacheCommit = { before, after: revision.current, now };
          } finally {
            endMetadataMutation();
          }
          const commit = cacheCommit;
          if (commit)
            updateRemoteCache(commit.before, commit.after, (remote) => {
              const saved = remote.find((goal) => goal.id === id);
              const updated = {
                ...(saved ?? {
                  id,
                  activities: [],
                  activitiesVersion: 0,
                  activitiesInitialized: false,
                  progress: 0,
                  tasks: 0,
                  completedTasks: 0,
                }),
                ...changes,
                id,
                name: changes.name.trim(),
                description: changes.description.trim(),
                activity: new Date(commit.now).toISOString(),
                lastActivityAt: commit.now,
              };
              return saved
                ? remote.map((goal) => (goal.id === id ? updated : goal))
                : [...remote, updated];
            });
        },
        deleteGoal: async (id) => {
          beginMetadataMutation();
          deleting.current.add(id);
          let deletedRemotely = false;
          let cacheCommit: { before: number; after: number } | undefined;
          try {
            try {
              await inFlight.current.get(id);
              if (!active.current) return;
              await deleteRemoteGoal(id);
              deletedRemotely = true;
            } catch (error) {
              deleting.current.delete(id);
              setSyncAttempt((attempt) => attempt + 1);
              throw error;
            }
            if (!active.current) return;
            rememberRemoteGoal(id);
            const current = parseGoals(getSnapshot());
            const goal = current.find((goal) => goal.id === id);
            if (!goal) throw new Error("Goal not found");
            const remaining = current.filter((goal) => goal.id !== id);
            const before = revision.current;
            storeGoals(remaining);
            cacheCommit = { before, after: revision.current };
            setSyncErrors((errors) => {
              const next = { ...errors };
              delete next[id];
              return next;
            });
            cleanupFiles(goal.activities ?? [], remaining, userId);
          } finally {
            endMetadataMutation();
            if (deletedRemotely)
              updateRemoteCache(
                cacheCommit?.before ?? revision.current,
                cacheCommit?.after ?? revision.current,
                (remote) => remote.filter((goal) => goal.id !== id),
              );
          }
        },
        deleteBranch: (goalId, activityId) => {
          const current = parseGoals(getSnapshot());
          const goal = current.find((goal) => goal.id === goalId);
          const branch = flattenActivities(goal?.activities ?? []).find(
            (activity) => activity.id === activityId,
          );
          if (!branch || !goal) throw new Error("Branch not found");
          const remaining = current.map((item) =>
            item.id === goalId
              ? {
                  ...item,
                  activities: removeActivity(item.activities ?? [], activityId),
                  syncPending: true,
                  activity: "Ahora",
                  lastActivityAt: Date.now(),
                }
              : item,
          );
          const before = revision.current;
          storeGoals(remaining);
          updateRemoteCache(before, revision.current, (remote) => remote);
          setSyncErrors((errors) => {
            const next = { ...errors };
            delete next[goalId];
            return next;
          });
          cleanupFiles([branch], remaining, userId);
          return flattenActivities([branch]).map((activity) => activity.id);
        },
        updateActivities: (id, activities) => {
          const current = parseGoals(getSnapshot());
          const goal = current.find((goal) => goal.id === id);
          if (!goal) throw new Error("Goal not found");
          const next =
            typeof activities === "function"
              ? activities(goal.activities ?? [])
              : activities;
          assertActivityLimits(next);
          if (!validActivities(next))
            throw new InputError(
              "Hay datos no válidos. Revisa los campos antes de reintentar.",
            );
          if (
            new TextEncoder().encode(
              JSON.stringify({
                activities: next,
                version: goal.activitiesVersion ?? 0,
                goal: {
                  name: goal.name,
                  description: goal.description,
                  color: goal.color,
                  icon: goal.icon,
                },
              }),
            ).byteLength >
            4 * 1024 * 1024
          )
            throw new InputError(
              "El diagrama supera los 4 MB. Reduce las notas o los recursos antes de reintentar.",
            );
          const before = revision.current;
          storeGoals(
            current.map((goal) =>
              goal.id === id
                ? {
                    ...goal,
                    activities: next,
                    activity: "Ahora",
                    lastActivityAt: Date.now(),
                    syncPending: true,
                  }
                : goal,
            ),
          );
          updateRemoteCache(before, revision.current, (remote) => remote);
          setSyncErrors((errors) => {
            const next = { ...errors };
            delete next[id];
            return next;
          });
        },
      }}
    >
      <ErrorToast
        id={`goals-load:${userId}`}
        message={
          goalsLoadError
            ? errorMessage(
                goalsQuery.error,
                "No se pudieron cargar las metas de Turso.",
              )
            : undefined
        }
        onRetry={() => void refetchGoals()}
      />
      {children}
      <GoalsSyncNotifications
        goals={goals}
        userId={userId}
        syncErrors={syncErrors}
        feedbackGoalId={feedbackGoalId}
        onRetry={() => void retrySync()}
      />
      <SyncConflictDialog
        ref={conflictDialog}
        onOverwrite={() => retrySync(true)}
      />
      <NewGoalModal
        dialogRef={dialog}
        onCreate={async (goal) => {
          const id = (creationId.current ??= crypto.randomUUID());
          beginMetadataMutation();
          let cacheCommit:
            { before: number; after: number; now: number } | undefined;
          try {
            await saveRemoteGoal({ id, changes: goal });
            if (!active.current) return;
            rememberRemoteGoal(id);
            const current = parseGoals(getSnapshot());
            const now = Date.now();
            const before = revision.current;
            storeGoals([
              ...current,
              {
                ...goal,
                id,
                progress: 0,
                tasks: 0,
                completedTasks: 0,
                activity: "Ahora",
                lastActivityAt: now,
              },
            ]);
            cacheCommit = { before, after: revision.current, now };
            creationId.current = null;
          } finally {
            endMetadataMutation();
          }
          const commit = cacheCommit;
          if (commit)
            updateRemoteCache(commit.before, commit.after, (remote) => {
              const created = {
                ...goal,
                id,
                activities: [],
                activitiesVersion: 0,
                activitiesInitialized: false,
                progress: 0,
                tasks: 0,
                completedTasks: 0,
                activity: new Date(commit.now).toISOString(),
                lastActivityAt: commit.now,
              };
              return remote.some((item) => item.id === id)
                ? remote.map((item) => (item.id === id ? created : item))
                : [...remote, created];
            });
        }}
      />
    </GoalsContext>
  );
}
