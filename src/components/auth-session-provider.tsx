"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";
import GoalsProvider from "@/components/goals/goals-provider";
import QueryProvider from "@/components/query-provider";
import UserPreferencesProvider from "@/components/user-preferences-provider";
import type { UserPreferences } from "@/lib/user-preferences";

export default function AuthSessionProvider({
  session,
  children,
  initialPreferences,
}: {
  session: Session;
  children: ReactNode;
  initialPreferences?: UserPreferences;
}) {
  const userId = session.user?.id;
  if (!userId) throw new Error("Authenticated user is required");
  return (
    <SessionProvider
      session={session}
      refetchInterval={5 * 60}
      refetchWhenOffline={false}
    >
      <QueryProvider key={userId}>
        <UserPreferencesProvider
          key={userId}
          userId={userId}
          initialPreferences={initialPreferences}
        >
          <GoalsProvider key={userId} userId={userId}>
            {children}
          </GoalsProvider>
        </UserPreferencesProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
