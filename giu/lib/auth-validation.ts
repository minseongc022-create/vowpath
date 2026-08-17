/** Shared email/password rules for GIU signup & login. */

const EMAIL_RE =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$/i;

export function normalizeAuthEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidAuthEmail(raw: string): boolean {
  const email = normalizeAuthEmail(raw);
  if (!email || email.length > 254) return false;
  if (email.includes("..")) return false;
  const [local, domain] = email.split("@");
  if (!local || !domain || local.length > 64 || domain.length > 253) return false;
  if (!domain.includes(".")) return false;
  return EMAIL_RE.test(email);
}

export function authEmailError(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "이메일을 입력해 주세요";
  if (!isValidAuthEmail(trimmed)) return "올바른 이메일 주소를 입력해 주세요 (예: name@email.com)";
  return null;
}

export function authPasswordError(raw: string): string | null {
  if (!raw) return "비밀번호를 입력해 주세요";
  if (raw.length < 8) return "비밀번호는 8자 이상이어야 합니다";
  if (raw.length > 128) return "비밀번호는 128자 이하로 입력해 주세요";
  if (!/[a-zA-Z]/.test(raw)) return "비밀번호에 영문을 포함해 주세요";
  if (!/[0-9]/.test(raw)) return "비밀번호에 숫자를 포함해 주세요";
  return null;
}

export function authPasswordConfirmError(password: string, confirm: string): string | null {
  if (!confirm) return "비밀번호 확인을 입력해 주세요";
  if (password !== confirm) return "비밀번호 확인이 일치하지 않습니다";
  return null;
}

export type PasswordRule = {
  id: "length" | "letter" | "number";
  label: string;
  ok: boolean;
};

export function authPasswordRules(password: string): PasswordRule[] {
  return [
    { id: "length", label: "8자 이상", ok: password.length >= 8 },
    { id: "letter", label: "영문 포함", ok: /[a-zA-Z]/.test(password) },
    { id: "number", label: "숫자 포함", ok: /[0-9]/.test(password) },
  ];
}

export function isAuthPasswordValid(raw: string): boolean {
  return authPasswordError(raw) === null;
}
