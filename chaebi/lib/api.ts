import { NextResponse } from "next/server";
import { ownerIdFromRequest } from "./owner";

/**
 * 라우트 공통 — 에러 모양과 소유자 확인을 한 곳에 모은다.
 * 라우트마다 제각각 응답을 만들면 클라이언트 쪽 에러 처리가 갈라진다.
 */

export type ApiFailure = { error: string; message: string };

export function fail(status: number, error: string, message: string): NextResponse<ApiFailure> {
  return NextResponse.json({ error, message }, { status });
}

export const ERRORS = {
  noSession: () => fail(401, "NO_SESSION", "세션이 없습니다. 새로고침 후 다시 시도해 주세요."),
  notFound: () => fail(404, "NOT_FOUND", "해당 계획을 찾을 수 없습니다."),
  badRequest: (message: string) => fail(400, "BAD_REQUEST", message),
  locked: (message: string) => fail(409, "LOCKED", message),
  server: () => fail(500, "SERVER_ERROR", "잠시 문제가 생겼습니다. 다시 시도해 주세요."),
} as const;

/** 소유자 id가 없으면 아무것도 하지 않는다 — 미들웨어가 항상 심어준다. */
export function requireOwner(request: Request): string | null {
  return ownerIdFromRequest(request);
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function newPlanId(): string {
  // 사람이 링크로 주고받는 값이라 짧고 헷갈리지 않는 문자만 쓴다
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
