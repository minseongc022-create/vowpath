import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma, isDatabaseConfigured } from "@/learn/lib/db";
import { getLearnAuthSecret } from "@/learn/lib/openai-config";

const providers = [
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
  ...(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET
    ? [
        Kakao({
          clientId: process.env.KAKAO_CLIENT_ID,
          clientSecret: process.env.KAKAO_CLIENT_SECRET,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: getLearnAuthSecret(),
  basePath: "/learn/api/auth",
  adapter: isDatabaseConfigured() ? PrismaAdapter(prisma) : undefined,
  providers,
  pages: {
    signIn: "/learn/login",
  },
  session: {
    strategy: isDatabaseConfigured() ? "database" : "jwt",
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      const protectedPrefixes = [
        "/learn/courses",
        "/learn/planner",
        "/learn/notes",
      ];
      const isProtected = protectedPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );
      if (isProtected && !session?.user) {
        return false;
      }
      return true;
    },
    session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? (token.sub as string);
      }
      return session;
    },
  },
  trustHost: true,
});

export async function getLearnSession() {
  try {
    return await auth();
  } catch {
    return null;
  }
}
