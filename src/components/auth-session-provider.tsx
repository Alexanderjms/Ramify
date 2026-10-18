"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";
import GoalsProvider from "@/components/goals/goals-provider";
import QueryProvider from "@/components/query-provider";
import UserPreferencesProvider from "@/components/user-preferences-provider";

export default function AuthSessionProvider({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const userId = session.user?.id;
  if (!userId) throw new Error("Authenticated user is required");
  return (
    <SessionProvider session={session}>
      <QueryProvider key={userId}>
        <UserPreferencesProvider key={userId} userId={userId}>
          <GoalsProvider key={userId} userId={userId}>
            {children}
          </GoalsProvider>
        </UserPreferencesProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
