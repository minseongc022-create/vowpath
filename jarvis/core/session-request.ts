/**
 * 요청에서 자비스 세션 꺼내기 — 쿠키 읽는 두 가지 경로
 *
 * 서버 컴포넌트(레이아웃·페이지)는 next/headers의 cookies()를 쓰고,
 * 라우트 핸들러는 Request의 cookie 헤더를 직접 읽는다. 같은 쿠키를
 * 두 방식으로 읽는 것뿐이라 한 파일에 둔다.
 */

import { cookies } from "next/headers";
import {
  JARVIS_SESSION_COOKIE,
  verifyJarvisSessionToken,
  type JarvisSession,
} from "./session";

/** 서버 컴포넌트용 */
export async function getJarvisSession(): Promise<JarvisSession | null> {
  const jar = await cookies();
  const token = jar.get(JARVIS_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyJarvisSessionToken(token);
}

function tokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${JARVIS_SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** 라우트 핸들러용 */
export async function getJarvisSessionFromRequest(
  request: Request,
): Promise<JarvisSession | null> {
  const token = tokenFromRequest(request);
  if (!token) return null;
  return verifyJarvisSessionToken(token);
}
