"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { goalViewQueryKey } from "@/components/query-provider";
import { parseGoalView, type GoalView } from "@/lib/goal-view";
import { responseError } from "@/lib/feedback";

export default function useGoalView(id: string, initialView: GoalView) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const userIdRef = useRef(userId);

  const queryClient = useQueryClient();
  const queryKey = useMemo(() => goalViewQueryKey(userId, id), [id, userId]);
  const mutationKey = useMemo(
    () => ["goal-view-save", userId, id] as const,
    [id, userId],
  );
  const savedQueryKey = useMemo(
    () => [...queryKey, "saved"] as const,
    [queryKey],
  );
  const latest = useRef(initialView);
  const position = useRef({
    scrollLeft: initialView.scrollLeft,
    scrollTop: initialView.scrollTop,
  });
  const localRevision = useRef(0);
  const savedRevision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saved = useRef(
    JSON.stringify(
      queryClient.getQueryData<GoalView>(savedQueryKey) ?? initialView,
    ),
  );
  const queue = useRef(Promise.resolve());
  const paused = useRef(false);
  const owner = useRef({ id, userId });
  const needsRecovery = useRef(false);

  const viewQuery = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const revision = localRevision.current;
      const cachedAtStart = queryClient.getQueryData<GoalView>(queryKey);
      const savedAtStart =
        queryClient.getQueryData<GoalView>(savedQueryKey) ?? initialView;
      if (
        revision !== savedRevision.current ||
        queryClient.isMutating({ mutationKey, exact: true }) ||
        (cachedAtStart &&
          JSON.stringify(cachedAtStart) !== JSON.stringify(savedAtStart))
      )
        return cachedAtStart ?? { ...latest.current, ...position.current };
      const response = await fetch(
        `/api/goals/${encodeURIComponent(id)}/view`,
        {
          cache: "no-store",
          headers: { "X-Ramify-User-Id": userId },
          signal,
        },
      );
      if (!response.ok) throw responseError(response);
      const remoteView = parseGoalView(await response.json());
      const cached = queryClient.getQueryData<GoalView>(queryKey);
      const cachedSaved = queryClient.getQueryData<GoalView>(savedQueryKey);
      const cacheChanged =
        JSON.stringify(cached) !== JSON.stringify(cachedAtStart);
      const savedChanged =
        JSON.stringify(cachedSaved ?? initialView) !==
        JSON.stringify(savedAtStart);
      const hasUnpersistedCache =
        cached &&
        JSON.stringify(cached) !== JSON.stringify(cachedSaved ?? initialView);
      if (
        revision !== localRevision.current ||
        localRevision.current !== savedRevision.current ||
        queryClient.isMutating({ mutationKey, exact: true }) ||
        cacheChanged ||
        savedChanged ||
        hasUnpersistedCache
      )
        return cached ?? { ...latest.current, ...position.current };
      queryClient.setQueryData(savedQueryKey, remoteView);
      return remoteView;
    },
    initialData: initialView,
    staleTime: 30_000,
    retry: false,
    enabled: Boolean(userId),
  });
  const queryView = viewQuery.data ?? initialView;
  const viewVersion = JSON.stringify([
    id,
    userId,
    viewQuery.dataUpdatedAt,
    queryView.zoom,
    queryView.collapsed,
  ]);
  const [localPresentation, setLocalPresentation] = useState<{
    version: string;
    zoom: number;
    collapsed: string[];
  } | null>(null);
  const presentation =
    localPresentation?.version === viewVersion ? localPresentation : queryView;
  const view = useMemo(
    () => ({
      ...queryView,
      zoom: presentation.zoom,
      collapsed: presentation.collapsed,
    }),
    [presentation, queryView],
  );
  const persistedView =
    queryClient.getQueryData<GoalView>(savedQueryKey) ?? initialView;
  const ownerKey = JSON.stringify([userId, id]);
  const [saveState, setSaveState] = useState<{
    ownerKey: string;
    error: unknown;
  }>({ ownerKey, error: null });
  const saveError = saveState.ownerKey === ownerKey && saveState.error;

  useLayoutEffect(() => {
    userIdRef.current = userId;
    if (owner.current.id !== id || owner.current.userId !== userId) {
      owner.current = { id, userId };
      localRevision.current = 0;
      savedRevision.current = 0;
      paused.current = false;
      needsRecovery.current = false;
    }
    if (localRevision.current !== savedRevision.current) return;
    latest.current = view;
    position.current = {
      scrollLeft: view.scrollLeft,
      scrollTop: view.scrollTop,
    };
    saved.current = JSON.stringify(persistedView);
    if (JSON.stringify(view) !== saved.current) {
      localRevision.current += 1;
      needsRecovery.current = true;
    }
  }, [id, persistedView, userId, view]);

  useEffect(() => {
    if (!queryClient.getQueryData(savedQueryKey))
      queryClient.setQueryData(savedQueryKey, initialView);
  }, [id, initialView, queryClient, savedQueryKey, userId]);

  const saveMutation = useMutation({
    mutationKey,
    scope: { id: JSON.stringify(mutationKey) },
    retry: false,
    mutationFn: async (input: {
      body: string;
      userId: string;
      keepalive: boolean;
    }) => {
      if (!input.userId || userIdRef.current !== input.userId) return;
      const response = await fetch(
        `/api/goals/${encodeURIComponent(id)}/view`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Ramify-User-Id": input.userId,
          },
          body: input.body,
          keepalive: input.keepalive,
        },
      );
      if (!response.ok) throw responseError(response);
    },
  });
  const mutateSave = saveMutation.mutateAsync;

  const saveView = useCallback(
    (force = false, keepalive = false) => {
      if (!userId || userIdRef.current !== userId || (!force && paused.current))
        return;
      const snapshot = { ...latest.current, ...position.current };
      const body = JSON.stringify(snapshot);
      const revision = localRevision.current;
      void queryClient.cancelQueries({ queryKey }, { revert: false });
      queryClient.setQueryData(queryKey, snapshot);
      queue.current = queue.current.then(async () => {
        if (userIdRef.current !== userId || (!force && paused.current)) return;
        if (body === saved.current) {
          savedRevision.current = Math.max(savedRevision.current, revision);
          return;
        }
        try {
          await mutateSave({
            body,
            userId,
            keepalive: keepalive && new Blob([body]).size < 64000,
          });
          if (userIdRef.current === userId) {
            saved.current = body;
            savedRevision.current = Math.max(savedRevision.current, revision);
            queryClient.setQueryData(savedQueryKey, snapshot);
            setSaveState({ ownerKey, error: null });
          }
        } catch (error) {
          if (userIdRef.current === userId) setSaveState({ ownerKey, error });
        }
      });
    },
    [mutateSave, ownerKey, queryClient, queryKey, savedQueryKey, userId],
  );

  const scheduleSave = useCallback(() => {
    clearTimeout(timer.current);
    if (!paused.current) timer.current = setTimeout(() => saveView(), 400);
  }, [saveView]);

  useEffect(() => {
    if (!needsRecovery.current) return;
    needsRecovery.current = false;
    scheduleSave();
  }, [id, scheduleSave, userId]);

  const setView = useCallback<Dispatch<SetStateAction<GoalView>>>(
    (update) => {
      const current = { ...latest.current, ...position.current };
      const next = typeof update === "function" ? update(current) : update;
      latest.current = { ...next, ...position.current };
      localRevision.current += 1;
      setLocalPresentation({
        version: viewVersion,
        zoom: next.zoom,
        collapsed: next.collapsed,
      });
      queryClient.setQueryData(queryKey, latest.current);
      scheduleSave();
    },
    [queryClient, queryKey, scheduleSave, viewVersion],
  );

  const updateScroll = useCallback(
    (scrollLeft: number, scrollTop: number) => {
      if (
        position.current.scrollLeft === scrollLeft &&
        position.current.scrollTop === scrollTop
      )
        return;
      position.current = { scrollLeft, scrollTop };
      localRevision.current += 1;
      scheduleSave();
    },
    [scheduleSave],
  );

  useEffect(() => {
    const onPageHide = () => saveView(false, true);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      clearTimeout(timer.current);
      saveView();
    };
  }, [saveView]);

  const pauseSaving = useCallback(async () => {
    paused.current = true;
    clearTimeout(timer.current);
    saveView(true);
    await queue.current;
  }, [saveView]);

  const resumeSaving = useCallback(() => {
    paused.current = false;
    scheduleSave();
  }, [scheduleSave]);

  return {
    view,
    setView,
    updateScroll,
    saveError,
    retrySave: () => saveView(),
    loadError: viewQuery.error,
    retryLoad: viewQuery.refetch,
    pauseSaving,
    resumeSaving,
  };
}
