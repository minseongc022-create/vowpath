import "server-only";

import { safeCompare } from "../crypto";

/**
 * 워커 인증.
 *
 * 이 토큰을 가진 쪽은 **모든 사용자의** 검사 작업을 집어갈 수 있고, 그 안에는
 * 테스트 계정 자격증명이 들어있다. 즉 이건 관리자 키에 준한다 — 절대 브라우저에
 * 내려가는 코드나 NEXT_PUBLIC_ 환경변수에 두지 않는다.
 */
export function isRunnerAuthorized(request: Request): boolean {
  const expected = process.env.VIBESAFE_RUNNER_TOKEN?.trim();
  if (!expected || expected.length < 24) return false;

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  return safeCompare(header.slice(7).trim(), expected);
}
