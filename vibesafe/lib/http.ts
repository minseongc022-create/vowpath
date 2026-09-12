import "server-only";

import { NextResponse } from "next/server";
import { checkRateLimit, clientIpFromRequest, rateLimitKey } from "@/lib/security/rate-limit";
import { isDatabaseConfigured } from "./db";
import { getSession, type VibesafeSession } from "./session";

/** 라우트에서 던지는 모든 실패의 공통 모양. 메시지는 사용자에게 보여줄 한국어다. */
export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function ok<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export const DB_REQUIRED_MESSAGE =
  "서버 데이터베이스가 아직 연결되지 않았습니다. 잠시 후 다시 시도해주세요.";

/**
 * 로그인 + DB 준비를 한 번에 확인한다. 두 검사를 따로 두면 라우트마다
 * 하나를 빠뜨리기 쉬워서 한 함수로 묶었다.
 */
export async function requireSession(): Promise<
  { ok: true; session: VibesafeSession } | { ok: false; response: NextResponse }
> {
  if (!isDatabaseConfigured()) {
    return { ok: false, response: fail(DB_REQUIRED_MESSAGE, 503) };
  }
  const session = await getSession();
  if (!session) {
    return { ok: false, response: fail("로그인이 필요합니다.", 401) };
  }
  return { ok: true, session };
}

/**
 * IP 기준 속도 제한.
 *
 * 로그인·가입처럼 남이 두드릴 수 있는 곳에는 전부 건다. KV가 없으면 프로세스
 * 메모리로 떨어지는데(lib/security/rate-limit.ts), 서버리스에서는 인스턴스마다
 * 따로 세므로 완벽하진 않다 — 그래도 없는 것보다 훨씬 낫고, KV를 붙이면
 * 코드 변경 없이 정확해진다.
 */
export async function enforceRateLimit(params: {
  request: Request;
  scope: string;
  limit: number;
  windowSeconds: number;
  /** IP 대신(또는 함께) 쓸 식별자 — 예: 이메일 */
  identity?: string;
}): Promise<NextResponse | null> {
  const ip = clientIpFromRequest(params.request);
  const value = params.identity ? `${ip}:${params.identity}` : ip;
  const result = await checkRateLimit({
    key: rateLimitKey(`vibesafe:${params.scope}`, value),
    limit: params.limit,
    windowSeconds: params.windowSeconds,
  });
  if (result.ok) return null;
  const waitSeconds = Math.max(1, result.resetAt - Math.floor(Date.now() / 1000));
  return fail(`요청이 너무 잦습니다. ${waitSeconds}초 후 다시 시도해주세요.`, 429);
}

/** 사용자 입력 JSON을 안전하게 읽는다 — 잘못된 본문으로 500이 나지 않게. */
export async function readJson<T = unknown>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
