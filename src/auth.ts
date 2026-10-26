import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { TursoAdapter } from "@/lib/auth-adapter";
import { getDatabase } from "@/lib/db";

const adapter = TursoAdapter(getDatabase);

const nextAuth = NextAuth({
  providers: [GitHub],
  adapter,
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token.sub ? token : null;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
});

export const { handlers, signIn, signOut } = nextAuth;

export async function auth() {
  const session = await nextAuth.auth();
  if (!session?.user?.id) return null;

  // Keep database failures outside Auth.js: JWT callback errors delete the cookie.
  // Still validate the user on every protected request; an outage must fail closed.
  const stored = await adapter.getUser!(session.user.id);
  if (!stored) return null;
  session.user.name = stored.name;
  session.user.email = stored.email;
  session.user.image = stored.image;
  return session;
}
