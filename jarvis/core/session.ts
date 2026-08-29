/**
 * 자비스 세션 — 로그인 상태를 담는 쿠키 하나
 *
 * ★ 옛 toss-shop에서 그대로 떼어와 자비스 안에 둔다
 *
 * 옛 구조에서는 세션이 `toss-shop/lib/auth.ts`에 있었고, 로그인 라우트가
 * 그걸 쓰면서 같이 `toss-shop/lib/store.ts`(2,876줄)를 물고 왔다. 그
 * store.ts가 옛 셀러 엔진 전체를 import하는 바람에, **비밀번호 한 번
 * 확인하려고 옛 엔진 106개 파일이 통째로 딸려오는** 구조였다. 자비스만
 * 남기고 옛 것을 지우려면 이 고리를 끊어야 한다.
 *
 * ★ 실제로 있던 구멍: 옛 전화 서비스 토큰이 자비스로 통했다
 *
 * effiroad.com은 예전에 미국 복원·냉난방 업체의 전화를 대신 받는 AI 서비스
 * 도메인이었다. 그 서비스의 세션(`lib/auth-token.ts`, 쿠키 `nightcall_session`)은
 * **자비스와 똑같이** AUTH_SECRET + HS256으로 서명하고, 서로를 구분하는
 * 표시(issuer/audience)가 없었다. 그래서 그 시절 가입자의 토큰 값을 자비스
 * 쿠키 자리에 그대로 넣으면 **서명 검증을 통과했다** — 막고 있던 건 이메일
 * 소유자 검사 하나뿐이었다.
 *
 * 그래서 자비스 토큰에는 발급자(iss)와 대상(aud)을 박는다. 옛 토큰에는 이
 * 표시가 없으니 서명이 맞아도 여기서 걸린다 — 이메일 검사에 기대지 않고
 * 구조적으로 막힌다.
 *
 * ⚠️ 이 표시를 넣으면서 **기존 토큰은 전부 무효가 된다**. 사장님은 한 번
 * 다시 로그인해야 한다 — 옛 서비스 토큰이 통하는 상태를 그대로 두는 것보다
 * 한 번 다시 로그인하는 쪽이 낫다.
 */

import { SignJWT, jwtVerify } from "jose";

/** 옛 이름 그대로 — 값 자체는 이제 iss/aud로 구분되므로 이름은 흔적일 뿐이다 */
export const JARVIS_SESSION_COOKIE = "toss_shop_session";

/**
 * 이 토큰이 자비스 것임을 못박는 표시.
 *
 * 같은 AUTH_SECRET을 쓰는 다른 서비스(옛 전화 서비스)의 토큰과 섞이지
 * 않게 하는 유일한 장치다 — 바꾸면 로그인된 세션이 전부 끊긴다.
 */
const JARVIS_ISSUER = "jarvis.effiroad";
const JARVIS_AUDIENCE = "jarvis.owner";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * 자비스는 가맹점(merchant)별로 나뉘지 않은 **하나의 전역 상태**다.
 * 그래서 merchantId가 필요 없지만, 이미 발급된 옛 토큰에는 들어 있다 —
 * 선택 항목으로 두어 옛 토큰도 그대로 통과시킨다.
 */
export type JarvisSession = {
  sub: string;
  email: string;
  name: string;
  merchantId?: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production");
    }
    return new TextEncoder().encode("dev-only-change-auth-secret-32chars");
  }
  return new TextEncoder().encode(secret);
}

export async function createJarvisSessionToken(payload: JarvisSession) {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(JARVIS_ISSUER)
    .setAudience(JARVIS_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyJarvisSessionToken(
  token: string,
): Promise<JarvisSession | null> {
  try {
    // issuer/audience를 **검증 옵션으로** 넘긴다 — 직접 비교하면 빠뜨리기
    // 쉽고, jose가 맞지 않으면 아예 예외를 던진다. 옛 전화 서비스 토큰은
    // 이 표시가 없어 서명이 맞아도 여기서 걸린다.
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: JARVIS_ISSUER,
      audience: JARVIS_AUDIENCE,
    });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
      merchantId: typeof payload.merchantId === "string" ? payload.merchantId : undefined,
    };
  } catch {
    return null;
  }
}

export function jarvisSessionCookieOptions(token: string) {
  return {
    name: JARVIS_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function clearJarvisSessionCookieOptions() {
  return {
    name: JARVIS_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
