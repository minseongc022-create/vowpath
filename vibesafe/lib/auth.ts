import "server-only";

import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { prisma } from "./db";

export const VIBESAFE_PASSWORD_MIN = 8;

/**
 * 비밀번호 규칙은 일부러 느슨하다.
 *
 * 대문자·특수문자를 강제하면 한국 사용자는 대부분 `Password1!` 같은 걸 쓴다 —
 * 규칙은 만족하지만 실제로는 더 약하다. 길이만 요구하고, 흔한 값은 막는다.
 */
const COMMON_PASSWORDS = new Set([
  "password", "12345678", "123456789", "1234567890", "qwertyui", "qwerty123",
  "11111111", "00000000", "abcd1234", "password1", "iloveyou", "asdf1234",
]);

export function validatePassword(password: string): string | null {
  if (password.length < VIBESAFE_PASSWORD_MIN) {
    return `비밀번호는 ${VIBESAFE_PASSWORD_MIN}자 이상이어야 합니다.`;
  }
  if (password.length > 200) return "비밀번호가 너무 깁니다.";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "너무 흔한 비밀번호입니다. 다른 것을 사용해주세요.";
  }
  if (/^(.)\1+$/.test(password)) return "같은 문자만으로는 만들 수 없습니다.";
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  if (!email) return "이메일을 입력해주세요.";
  if (email.length > 254) return "이메일이 너무 깁니다.";
  if (!EMAIL_RE.test(email)) return "이메일 형식을 확인해주세요.";
  return null;
}

export type AuthResult =
  | { ok: true; user: { id: string; email: string; name: string | null } }
  | { ok: false; error: string };

export async function signUp(params: {
  email: string;
  password: string;
  name?: string | null;
}): Promise<AuthResult> {
  const email = normalizeEmail(params.email);
  const emailError = validateEmail(email);
  if (emailError) return { ok: false, error: emailError };
  const passwordError = validatePassword(params.password);
  if (passwordError) return { ok: false, error: passwordError };

  const existing = await prisma.vibesafeUser.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "이미 가입된 이메일입니다. 로그인해주세요." };

  const passwordHash = await hashPassword(params.password);
  const user = await prisma.vibesafeUser.create({
    data: { email, passwordHash, name: params.name?.trim() || null },
    select: { id: true, email: true, name: true },
  });
  return { ok: true, user };
}

export async function signIn(params: { email: string; password: string }): Promise<AuthResult> {
  const email = normalizeEmail(params.email);
  const user = await prisma.vibesafeUser.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  // ★ 없는 계정과 틀린 비밀번호를 구분해서 알려주지 않는다. 구분되면 "이
  //   이메일이 가입돼 있는지" 확인하는 용도로 쓸 수 있다.
  const GENERIC = "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (!user) {
    // 계정이 없어도 같은 시간을 쓴다 — 응답 속도로 존재 여부를 알아채지 못하게.
    await verifyPassword(params.password, "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");
    return { ok: false, error: GENERIC };
  }
  const valid = await verifyPassword(params.password, user.passwordHash);
  if (!valid) return { ok: false, error: GENERIC };

  await prisma.vibesafeUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
}
