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
  // passwordHash가 없으면 "GitHub로 계속하기"로만 가입한 계정이다 — 대조할
  // 비밀번호 자체가 없으니 항상 거절한다. 이때도 계정이 없을 때와 똑같이
  // 가짜 해시를 대조해 시간을 맞춘다 — 아니면 응답 속도 차이로 "이 이메일은
  // GitHub 전용 계정이다"를 알아챌 수 있다.
  if (!user || !user.passwordHash) {
    await verifyPassword(params.password, "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");
    return { ok: false, error: GENERIC };
  }
  const valid = await verifyPassword(params.password, user.passwordHash);
  if (!valid) return { ok: false, error: GENERIC };

  await prisma.vibesafeUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
}

export type GithubAuthResult =
  | { status: "ok"; user: { id: string; email: string; name: string | null } }
  | { status: "email_taken" };

/**
 * "GitHub로 계속하기" — 신원이 확인된 뒤 로그인시키거나 새 계정을 만든다.
 *
 * ★ 검증된 이메일이 겹쳐도 자동으로 합치지 않는다
 *
 * 이미 이메일/비밀번호로 가입한 사람이 나중에 "GitHub로 계속하기"를 누르면,
 * 그 GitHub 계정의 검증된 이메일이 기존 계정과 같을 수 있다. 그렇다고
 * 자동으로 그 계정에 로그인시키면 "비밀번호를 몰라도 로그인되는 길"이
 * 생긴다 — 비밀번호 확인을 완전히 건너뛰기 때문이다. 그래서 이 경우는
 * 계정을 만들거나 로그인시키지 않고 email_taken을 돌려주며, 화면은
 * "로그인 후 계정 설정에서 GitHub를 연결해주세요"로 안내한다.
 */
export async function findOrCreateFromGithub(params: {
  githubUserId: string;
  login: string;
  verifiedEmail: string | null;
}): Promise<GithubAuthResult> {
  const existingByGithub = await prisma.vibesafeUser.findUnique({
    where: { githubUserId: params.githubUserId },
    select: { id: true, email: true, name: true },
  });
  if (existingByGithub) {
    await prisma.vibesafeUser.update({ where: { id: existingByGithub.id }, data: { lastLoginAt: new Date() } });
    return { status: "ok", user: existingByGithub };
  }

  if (params.verifiedEmail) {
    const existingByEmail = await prisma.vibesafeUser.findUnique({
      where: { email: normalizeEmail(params.verifiedEmail) },
      select: { id: true },
    });
    if (existingByEmail) return { status: "email_taken" };
  }

  // 검증된 이메일이 없으면(비공개 설정 등) 알림을 받을 수 없는 계정이 된다.
  // 그래도 가입 자체를 막지는 않는다 — 계정 설정에서 나중에 진짜 이메일을
  // 등록하게 하고, 그 전까지는 GitHub 로그인 자체가 실제 이메일 확인을
  // 대신한다.
  const email = params.verifiedEmail
    ? normalizeEmail(params.verifiedEmail)
    : `${params.githubUserId}+${params.login}@users.noreply.github.com`;

  const user = await prisma.vibesafeUser.create({
    data: { email, passwordHash: null, githubUserId: params.githubUserId, name: params.login },
    select: { id: true, email: true, name: true },
  });
  return { status: "ok", user };
}
