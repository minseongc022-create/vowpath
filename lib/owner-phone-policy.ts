import { normalizeSmsPhone } from "./phone";
import { isEnglishUi } from "./locale";
import {
  KR_PHONE_INPUT_PLACEHOLDER,
  normalizeUsBusinessPhone,
  US_PHONE_INPUT_PLACEHOLDER,
} from "./us-contact";

function normalizeKrBusinessPhone(input: string): string | null {
  const normalized = normalizeSmsPhone(input);
  if (!normalized?.startsWith("+82")) return null;
  const national = normalized.slice(3);
  if (national.length < 9 || national.length > 11) return null;
  if (!national.startsWith("10")) return null;
  return normalized;
}

const DEFAULT_KR_OWNER_EMAILS = [
  "minseongc072@gmail.com",
  "minseongc022@gmail.com",
];

function krOwnerEmailAllowlist(): string[] {
  const raw = process.env.OWNER_KR_PHONE_EMAILS?.trim();
  if (!raw) return DEFAULT_KR_OWNER_EMAILS;
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** Owner accounts that may register a KR (+82) mobile instead of US +1. */
export function isKrOwnerPhoneEmail(email: string): boolean {
  return krOwnerEmailAllowlist().includes(email.trim().toLowerCase());
}

export function normalizeOwnerSignupPhone(
  email: string,
  input: string,
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isKrOwnerPhoneEmail(email)) {
    return (
      normalizeKrBusinessPhone(trimmed) ?? normalizeUsBusinessPhone(trimmed)
    );
  }
  return normalizeUsBusinessPhone(trimmed);
}

export function ownerSignupPhoneError(email: string): string {
  if (isKrOwnerPhoneEmail(email)) {
    return isEnglishUi()
      ? "Check your Korean mobile number format. (e.g. 010-1234-5678)"
      : "한국 휴대폰 번호 형식을 확인해 주세요. (예: 010-1234-5678)";
  }
  return isEnglishUi()
    ? "Check your US mobile number format. (e.g. (512) 555-0100)"
    : "미국 휴대폰 번호 형식을 확인해 주세요. (예: (512) 555-0100)";
}

export function ownerSignupPhonePlaceholder(email: string): string {
  return isKrOwnerPhoneEmail(email)
    ? KR_PHONE_INPUT_PLACEHOLDER
    : US_PHONE_INPUT_PLACEHOLDER;
}

export function ownerSignupPhoneHint(email: string): string {
  if (isKrOwnerPhoneEmail(email)) {
    return isEnglishUi()
      ? "Korean mobile (010…) — this account signs up with a KR number. Choose email or SMS verification."
      : "한국 휴대폰(010…) — 이 계정은 한국 번호로 가입됩니다. 인증은 이메일 또는 문자(SMS) 중 선택하세요.";
  }
  return isEnglishUi()
    ? "US mobile (+1) — used for new request alerts and Reply 1/2 approvals. e.g. (512) 555-0100"
    : "미국 휴대폰(+1) — 새 요청 알림·Reply 1/2 답장에 사용됩니다. 예: (512) 555-0100";
}
