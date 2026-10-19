"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountLanguageBridge, useLanguage } from "./language-provider";
import DashboardLoadingSkeleton from "./dashboard/loading-skeleton";
import {
  defaultUserPreferences,
  parsePreferencesPatch,
  type UserPreferences,
} from "@/lib/user-preferences";

const preferencesQueryKey = (userId: string) =>
  ["user-preferences", userId] as const;

type PreferencesCache = { preferences: UserPreferences; loaded: boolean };

const PreferencesContext = createContext<{
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
} | null>(null);

export default function UserPreferencesProvider({
  userId,
  children,
  initialPreferences,
}: {
  userId: string;
  children: ReactNode;
  initialPreferences?: UserPreferences;
}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => preferencesQueryKey(userId), [userId]);
  const pending = useRef<Partial<UserPreferences>>({});
  const [syncError, setSyncError] = useState(false);
  const schedule = useRef<(delay?: number) => void>(() => {});
  const storageKey = `ramify:preferences:pending:${userId}`;

  const preferencesQuery = useQuery({
    queryKey,
    initialData: initialPreferences
      ? { preferences: initialPreferences, loaded: true }
      : undefined,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/preferences", {
        cache: "no-store",
        headers: { "X-Ramify-User-Id": userId },
        signal,
      });
      if (!response.ok)
        throw Object.assign(new Error("Preferences load failed"), {
          status: response.status,
        });
      return {
        preferences: {
          ...defaultUserPreferences,
          ...parsePreferencesPatch(await response.json()),
          ...pending.current,
        },
        loaded: true,
      };
    },
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const savePreferences = useMutation({
    mutationFn: async (patch: Partial<UserPreferences>) => {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Ramify-User-Id": userId,
        },
        body: JSON.stringify(patch),
      });
      if (!response.ok)
        throw Object.assign(new Error("Preferences save failed"), {
          status: response.status,
        });
      return {
        ...defaultUserPreferences,
        ...parsePreferencesPatch(await response.json()),
      };
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey, exact: true });
      queryClient.setQueryData<PreferencesCache>(queryKey, (current) => ({
        preferences: {
          ...defaultUserPreferences,
          ...current?.preferences,
          ...pending.current,
          ...patch,
        },
        loaded:
          Boolean(current?.loaded) ||
          pending.current.language !== undefined ||
          patch.language !== undefined,
      }));
    },
    onSuccess: async (saved) => {
      await queryClient.cancelQueries({ queryKey, exact: true });
      queryClient.setQueryData<PreferencesCache>(queryKey, {
        preferences: { ...saved, ...pending.current },
        loaded: true,
      });
    },
    retry: false,
  });
  const { mutateAsync } = savePreferences;

  const persist = useCallback(() => {
    try {
      if (Object.keys(pending.current).length)
        localStorage.setItem(storageKey, JSON.stringify(pending.current));
      else localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  const updatePreferences = useCallback(
    (value: Partial<UserPreferences>) => {
      const patch = parsePreferencesPatch(value);
      pending.current = { ...pending.current, ...patch };
      persist();
      queryClient.setQueryData<PreferencesCache>(
        preferencesQueryKey(userId),
        (current) => ({
          preferences: {
            ...defaultUserPreferences,
            ...current?.preferences,
            ...patch,
          },
          loaded: Boolean(current?.loaded) || patch.language !== undefined,
        }),
      );
      schedule.current();
    },
    [persist, queryClient, userId],
  );

  useEffect(() => {
    let active = true;
    let busy = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved)
        pending.current = {
          ...parsePreferencesPatch(JSON.parse(saved)),
          ...pending.current,
        };
    } catch {}

    if (Object.keys(pending.current).length)
      queryClient.setQueryData<PreferencesCache>(queryKey, (current) => ({
        preferences: {
          ...defaultUserPreferences,
          ...current?.preferences,
          ...pending.current,
        },
        loaded:
          Boolean(current?.loaded) || pending.current.language !== undefined,
      }));

    function enqueue(delay = 300) {
      clearTimeout(timer);
      if (active) timer = setTimeout(() => void sync(), delay);
    }

    async function sync() {
      if (!active || busy || !Object.keys(pending.current).length) return;
      busy = true;
      const patch = { ...pending.current };
      try {
        await mutateAsync(patch);
        if (!active) return;
        for (const key of Object.keys(patch) as (keyof UserPreferences)[])
          if (pending.current[key] === patch[key]) delete pending.current[key];
        persist();
        failures = 0;
        setSyncError(false);
      } catch {
        if (!active) return;
        failures += 1;
        setSyncError(true);
      } finally {
        busy = false;
        if (active && Object.keys(pending.current).length)
          enqueue(
            failures ? Math.min(30000, 1000 * 2 ** Math.min(failures, 5)) : 300,
          );
      }
    }

    schedule.current = enqueue;
    if (Object.keys(pending.current).length) enqueue(0);
    const onOnline = () => enqueue(0);
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      schedule.current = () => {};
    };
  }, [mutateAsync, persist, queryClient, queryKey, storageKey]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences:
          preferencesQuery.data?.preferences ?? defaultUserPreferences,
        updatePreferences,
      }}
    >
      <AccountLanguageBridge
        language={
          preferencesQuery.data?.loaded
            ? preferencesQuery.data.preferences.language
            : null
        }
        onChange={(language) => updatePreferences({ language })}
      >
        {preferencesQuery.data?.loaded ? (
          children
        ) : (
          <DashboardLoadingSkeleton />
        )}
        {(preferencesQuery.isError || syncError) && (
          <PreferencesError
            onRetry={() => {
              if (preferencesQuery.isError) void preferencesQuery.refetch();
              schedule.current(0);
            }}
          />
        )}
      </AccountLanguageBridge>
    </PreferencesContext.Provider>
  );
}

function PreferencesError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-sm text-white shadow-lg"
    >
      <p>
        {t(
          "No se pudieron sincronizar tus preferencias. Se reintentará automáticamente.",
        )}
      </p>
      <button type="button" className="mt-2 underline" onClick={onRetry}>
        {t("Reintentar")}
      </button>
    </div>
  );
}

export function useUserPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("UserPreferencesProvider is required");
  return context;
}
