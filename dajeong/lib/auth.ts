import "server-only";

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import type { OAuthConfig } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { dajeongAuthAdapterClient, isDatabaseConfigured } from "./db";

function getDajeongAuthSecret(): string | undefined {
  return (
    process.env.DAJEONG_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    (process.env.NEXT_PUBLIC_DAJEONG_AUTH_DEMO === "true" ? "dajeong-demo-secret-do-not-use-in-production" : undefined)
  );
}

type TossProfile = { id: string; name?: string; email?: string; profile_image?: string };

/**
 * Toss has no publicly documented "Sign in with Toss" OAuth for third-party sites the way
 * Google/Kakao/Naver do — their public developer docs (developers.tosspayments.com) cover
 * payments, not consumer login. This is wired as a standards-shaped OAuth2 provider so it
 * activates the moment real endpoint URLs and app credentials exist (from a Toss partner
 * agreement), but it is NOT verified against a real Toss login flow. Only appears in the
 * provider list when every TOSS_* env var below is actually set — never with guessed
 * endpoints standing in for real ones.
 */
function tossProvider(): OAuthConfig<TossProfile> | null {
  const clientId = process.env.TOSS_CLIENT_ID;
  const clientSecret = process.env.TOSS_CLIENT_SECRET;
  const authorizationUrl = process.env.TOSS_AUTHORIZATION_URL;
  const tokenUrl = process.env.TOSS_TOKEN_URL;
  const userinfoUrl = process.env.TOSS_USERINFO_URL;
  if (!clientId || !clientSecret || !authorizationUrl || !tokenUrl || !userinfoUrl) return null;
  return {
    id: "toss",
    name: "Toss",
    type: "oauth",
    clientId,
    clientSecret,
    authorization: authorizationUrl,
    token: tokenUrl,
    userinfo: userinfoUrl,
    profile(profile: TossProfile) {
      return { id: profile.id, name: profile.name ?? null, email: profile.email ?? null, image: profile.profile_image ?? null };
    },
  };
}

const providers = [
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
    : []),
  ...(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET
    ? [Kakao({ clientId: process.env.KAKAO_CLIENT_ID, clientSecret: process.env.KAKAO_CLIENT_SECRET })]
    : []),
  ...(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET
    ? [Naver({ clientId: process.env.NAVER_CLIENT_ID, clientSecret: process.env.NAVER_CLIENT_SECRET })]
    : []),
  ...(tossProvider() ? [tossProvider()!] : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: getDajeongAuthSecret(),
  basePath: "/dajeong/api/auth",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: isDatabaseConfigured() ? PrismaAdapter(dajeongAuthAdapterClient as any) : undefined,
  providers,
  pages: {
    signIn: "/dajeong/login",
  },
  session: {
    strategy: isDatabaseConfigured() ? "database" : "jwt",
  },
  callbacks: {
    session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? (token.sub as string);
      }
      return session;
    },
  },
  trustHost: true,
});
