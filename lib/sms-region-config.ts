import { normalizeSmsPhone } from "./phone";
import {
  isValidBusinessEmail,
  normalizeUsBusinessPhone,
} from "./us-contact";

/**
 * Dev-only: allow KR (+82) owner/customer SMS for local testing.
 * Ignored in production — US shops always use +1.
 */
export function isKrSmsTestMode(): boolean {
  const enabled =
    process.env.SMS_ALLOW_KR_RECIPIENTS === "1" ||
    process.env.SMS_ALLOW_KR_RECIPIENTS === "true" ||
    process.env.SMS_ALLOW_KR_RECIPIENTS === "yes";

  if (process.env.NODE_ENV === "production") {
    if (enabled) {
      console.warn(
        "[sms] SMS_ALLOW_KR_RECIPIENTS is ignored in production (US +1 only).",
      );
    }
    return false;
  }
  return enabled;
}

/** When true, outbound SMS must target US +1 (production default). */
export function smsRestrictToUsRecipients(): boolean {
  return !isKrSmsTestMode();
}

export function ownerContactPhoneLabel(): string {
  return isKrSmsTestMode()
    ? "휴대폰 번호 (한국 테스트)"
    : "휴대폰 번호 (미국)";
}

export function ownerContactPhoneHint(): string {
  return isKrSmsTestMode()
    ? "개발 테스트: 010-1234-5678 (Twilio Verified +82, Geo KR 허용). 배포/미국 업체는 +1만 사용합니다."
    : "SMS로 신규 요청·Reply 1=확정·2=거절. 예: (512) 555-0100 또는 +1 512-555-0100";
}

/** KR mobile for owner alerts in dev (010… → +8210…). */
export function normalizeKrBusinessPhone(input: string): string | null {
  const normalized = normalizeSmsPhone(input);
  if (!normalized?.startsWith("+82")) return null;
  const national = normalized.slice(3);
  if (national.length < 9 || national.length > 11) return null;
  if (!national.startsWith("10")) return null;
  return normalized;
}

/** Owner alert destination: US +1 in production; US or KR in dev test mode. */
export function normalizeOwnerAlertPhone(input: string): string | null {
  if (isKrSmsTestMode()) {
    return (
      normalizeKrBusinessPhone(input) ?? normalizeUsBusinessPhone(input) ?? null
    );
  }
  return normalizeUsBusinessPhone(input);
}

/** Customer/callback SMS destination (same rules as owner in dev KR mode). */
export function normalizeCustomerSmsPhone(input: string): string | null {
  if (smsRestrictToUsRecipients()) {
    const us = normalizeUsBusinessPhone(input);
    if (us) return us;
    const e164 = normalizeSmsPhone(input);
    return e164?.startsWith("+1") ? e164 : null;
  }
  return (
    normalizeKrBusinessPhone(input) ??
    normalizeUsBusinessPhone(input) ??
    normalizeSmsPhone(input)
  );
}

export function formatOwnerPhoneDisplay(e164: string): string {
  if (e164.startsWith("+82") && e164.length >= 12) {
    const d = e164.slice(3);
    if (d.length === 10 && d.startsWith("10")) {
      return `010-${d.slice(2, 6)}-${d.slice(6)}`;
    }
  }
  if (e164.startsWith("+1") && e164.length === 12) {
    const d = e164.slice(2);
    return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return e164;
}

export function isOwnerContactCompleteForSms(user: {
  email?: string;
  phone?: string;
}): boolean {
  return (
    isValidBusinessEmail(user.email ?? "") &&
    normalizeOwnerAlertPhone(user.phone ?? "") !== null
  );
}
