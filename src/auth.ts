import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { TursoAdapter } from "@/lib/auth-adapter";
import { getDatabase } from "@/lib/db";

const adapter = TursoAdapter(getDatabase);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  adapter,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      if (!token.sub) return null;
      const stored = await adapter.getUser!(token.sub);
      if (!stored) return null;
      token.name = stored.name;
      token.email = stored.email;
      token.picture = stored.image;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
});
