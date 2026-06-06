import { normalizeSmsPhone } from "./phone";

export const US_PHONE_INPUT_PLACEHOLDER = "(512) 555-0100";
export const KR_PHONE_INPUT_PLACEHOLDER = "010-1234-5678";
export const US_EMAIL_INPUT_PLACEHOLDER = "owner@yourhvacshop.com";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** US mobile/landline for shop owner alerts (E.164 +1, 10 digits). */
export function normalizeUsBusinessPhone(input: string): string | null {
  const normalized = normalizeSmsPhone(input);
  if (!normalized?.startsWith("+1")) return null;
  const national = normalized.slice(2);
  if (national.length !== 10) return null;
  return normalized;
}

export function isValidBusinessEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e || e.length > 254) return false;
  return EMAIL_RE.test(e);
}

export function formatUsPhoneDisplay(e164: string): string {
  if (!e164.startsWith("+1") || e164.length !== 12) return e164;
  const d = e164.slice(2);
  return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function isOwnerContactComplete(user: {
  email?: string;
  phone?: string;
}): boolean {
  return (
    isValidBusinessEmail(user.email ?? "") &&
    normalizeUsBusinessPhone(user.phone ?? "") !== null
  );
}
