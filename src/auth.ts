import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { findUserByEmail } from "@/features/auth/repository";

const credentials = z.object({ email: z.email(), password: z.string().min(1) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(input) {
        const parsed = credentials.safeParse(input);
        if (!parsed.success) return null;
        const user = await findUserByEmail(parsed.data.email);
        if (!user || !(await compare(parsed.data.password, user.passwordHash)))
          return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (token.role) session.user.role = token.role;
      }
      return session;
    },
  },
});
