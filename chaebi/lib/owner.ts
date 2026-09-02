/**
 * 익명 소유자 id — 미들웨어(Edge)와 서버 코드(Node)가 함께 쓰는 부분.
 *
 * `next/headers`를 import 하는 순간 Edge 미들웨어에서 못 쓰게 되므로, 순수
 * 함수만 여기 두고 서버 전용 헬퍼는 session.ts에 둔다.
 *
 * ★ 왜 로그인이 없는가
 *
 * 이 앱의 약속은 "검색하지 말고 상황만 말하세요"다. 그 첫 화면에 회원가입이
 * 있으면 약속이 깨진다. 그래서 기기마다 임의의 id 하나를 쿠키에 심고 그걸로
 * 계획을 묶는다. 실제 결제·예약을 태우는 단계에서만 신원 확인을 받으면 된다.
 *
 * id는 122비트 난수(UUID v4)라 남의 id를 찍어 맞힐 수 없다. httpOnly가
 * 아닌 이유는 이 값 자체로 아무 권한도 생기지 않고(자기 계획 조회가 전부),
 * 미들웨어·서버·클라이언트가 같은 값을 봐야 하기 때문이다.
 */

export const CHAEBI_UID_COOKIE = "chaebi_uid";
export const CHAEBI_UID_MAX_AGE = 60 * 60 * 24 * 365;

const UID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isValidOwnerId(value: string | undefined | null): value is string {
  return typeof value === "string" && UID_PATTERN.test(value);
}

export function newOwnerId(): string {
  return crypto.randomUUID();
}

/** 라우트 핸들러용 — 요청 헤더에서 직접 꺼낸다. */
export function ownerIdFromRequest(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== CHAEBI_UID_COOKIE) continue;
    const value = decodeURIComponent(rest.join("="));
    return isValidOwnerId(value) ? value : null;
  }
  return null;
}

export function ownerCookieOptions() {
  return {
    name: CHAEBI_UID_COOKIE,
    path: "/chaebi",
    maxAge: CHAEBI_UID_MAX_AGE,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
