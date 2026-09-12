import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * VibeSafe 로그인 세션 — 쿠키 하나에 담긴 서명 토큰.
 *
 * ★ iss/aud를 반드시 박는다
 *
 * 이 저장소에는 같은 `AUTH_SECRET`으로 HS256 서명하는 다른 제품의 세션이 이미
 * 여럿 있다. 표시가 없으면 그쪽 토큰을 이 쿠키 자리에 그대로 넣었을 때 서명
 * 검증을 통과한다 — 자비스에서 실제로 있었던 사고다(jarvis/core/session.ts).
 * 그래서 발급자와 대상을 박고, 검증 때도 둘 다 확인한다.
 *
 * ★ 왜 DB 세션이 아니라 JWT인가
 *
 * 고정비를 낮추는 게 이 제품의 전제다. 서버리스에서 요청마다 세션 행을 읽는
 * 것보다 서명 검증이 싸고, MVP 규모에서 "즉시 강제 로그아웃"이 필요한 시나리오가
 * 아직 없다. 필요해지면 여기에 버전 클레임을 추가하는 것으로 확장한다.
 */

export const VIBESAFE_SESSION_COOKIE = "vibesafe_session";

const ISSUER = "vibesafe.auth";
const AUDIENCE = "vibesafe.user";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type VibesafeSession = {
  userId: string;
  email: string;
  name: string | null;
};

function getSecret(): Uint8Array {
  const secret = process.env.VIBESAFE_AUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("VIBESAFE_AUTH_SECRET(또는 AUTH_SECRET)이 32자 이상이어야 합니다.");
    }
    return new TextEncoder().encode("vibesafe-dev-only-secret-change-me-32+chars");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(session: VibesafeSession): Promise<string> {
  return new SignJWT({ email: session.email, name: session.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string | undefined | null): Promise<VibesafeSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      email: typeof payload.email === "string" ? payload.email : "",
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function clearSessionCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: 0 };
}

/** 서버 컴포넌트/라우트에서 현재 로그인 사용자를 읽는 유일한 경로. */
export async function getSession(): Promise<VibesafeSession | null> {
  const store = await cookies();
  return verifySessionToken(store.get(VIBESAFE_SESSION_COOKIE)?.value);
}
