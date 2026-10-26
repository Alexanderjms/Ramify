"use client";

import { useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from "@tanstack/react-query";

export const goalViewQueryKey = (userId: string, goalId: string) =>
  ["goal-view", userId, goalId] as const;

function getHttpStatus(error: unknown): number | undefined {
  if (error instanceof Response) return error.status;
  if (!error || typeof error !== "object") return undefined;

  const candidates = [error, "response" in error ? error.response : undefined];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    if ("status" in candidate && typeof candidate.status === "number")
      return candidate.status;
    if ("statusCode" in candidate && typeof candidate.statusCode === "number")
      return candidate.statusCode;
  }
}

export function retryRequest(failureCount: number, error: unknown) {
  const status = getHttpStatus(error);
  return (
    (status === undefined
      ? error instanceof TypeError
      : status === 0 || status >= 500) && failureCount < 2
  );
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: retryRequest,
          },
        },
      }),
  );

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
}
