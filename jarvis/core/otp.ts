/**
 * 로그인 2단계 인증 — 비밀번호를 알아도 휴대폰 없이는 못 들어온다
 *
 * ★ 사장님 요구
 *
 * "만약 접근을 진짜 만약 하더라도 내 계정에 절대 못 들어오게." 비밀번호
 * 하나만으로 들어오는 구조에서는 그 비밀번호가 새는 순간(재사용, 유출,
 * 추측) 그걸로 끝이다. 두 번째 관문을 두면 비밀번호를 안다고 해도
 * **사장님 휴대폰을 쥔 사람**만 실제로 들어올 수 있다.
 *
 * ★ 왜 문자(SMS)인가
 *
 * 이 프로젝트는 이미 사장님 휴대폰을 유일한 신뢰 채널로 쓰고 있다(반품
 * 결정, 비밀번호 재설정도 전부 그 번호로 간다). 새 채널을 하나 더 만들면
 * 관리할 구멍이 늘 뿐이다 — 있는 걸 그대로 쓴다.
 *
 * ★ 세션 토큰과 완전히 다른 이름표를 쓴다
 *
 * "임시로 로그인 중"이라는 표시(jarvis.otp-pending)가 실제 로그인
 * 표시(jarvis.owner)와 섞이면, 비밀번호만 맞고 문자 인증은 안 된 상태가
 * 로그인된 것처럼 보일 수 있다. 그래서 발급자·용도를 완전히 분리하고,
 * 코드를 맞혀야만 실제 세션 토큰(session.ts)으로 넘어간다.
 *
 * ★ 코드 원문은 어디에도 저장하지 않는다
 *
 * 쿠키에 담아 사장님 브라우저로 돌려보내는 값은 코드가 아니라 **해시**다.
 * 원문은 문자로 나갈 때 한 번만 존재하고, 그 뒤로는 해시만 비교한다 —
 * 이 쿠키가 어떤 경로로든 새어도 코드 자체는 못 얻는다.
 */

import { SignJWT, jwtVerify } from "jose";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const PENDING_OTP_COOKIE = "jarvis_otp_pending";

const OTP_ISSUER = "jarvis.otp-pending";
const OTP_AUDIENCE = "jarvis.otp-pending";
/** 5분 — 문자가 늦게 와도 입력할 시간은 주되, 너무 길게 열어두지 않는다 */
export const OTP_TTL_SECONDS = 5 * 60;

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

/** 6자리 숫자 — 처음에 0이 와도 그대로 유효하다(길이만 맞으면 된다) */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * 코드를 이메일에 묶어 해시한다.
 *
 * 이메일을 같이 섞는 이유 — 나중에 소유자가 여러 명이 되더라도(지금은
 * 아니지만) 한 사람의 코드가 다른 사람 코드로 잘못 맞춰지지 않는다.
 */
export function hashOtpCode(email: string, code: string): string {
  return createHmac("sha256", getSecret())
    .update(`${email.toLowerCase()}:${code}`)
    .digest("hex");
}

/** 시간차 공격을 막는 비교 — 문자열 길이가 항상 같은 해시값끼리만 비교한다 */
export function otpHashMatches(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type PendingOtp = { email: string; otpHash: string };

export async function createPendingOtpToken(payload: PendingOtp): Promise<string> {
  return new SignJWT({ email: payload.email, otpHash: payload.otpHash })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(OTP_ISSUER)
    .setAudience(OTP_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${OTP_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyPendingOtpToken(token: string): Promise<PendingOtp | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: OTP_ISSUER,
      audience: OTP_AUDIENCE,
    });
    if (typeof payload.email !== "string" || typeof payload.otpHash !== "string") return null;
    return { email: payload.email, otpHash: payload.otpHash };
  } catch {
    return null;
  }
}

export function pendingOtpCookieOptions(token: string) {
  return {
    name: PENDING_OTP_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OTP_TTL_SECONDS,
  };
}

export function clearPendingOtpCookieOptions() {
  return {
    name: PENDING_OTP_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
