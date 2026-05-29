/** E.164 for SMS (US +1 and KR +82 mobile). */
export function normalizeSmsPhone(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+") && digits.length >= 10) {
    return `+${digits}`;
  }

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  if (digits.length === 11 && digits.startsWith("010")) {
    return `+82${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("10")) {
    return `+82${digits}`;
  }

  return null;
}

/** @deprecated Use normalizeSmsPhone for SMS; kept for US-only login matching */
export function normalizeUsPhone(input: string): string | null {
  return normalizeSmsPhone(input);
}

export const US_PHONE_PLACEHOLDER = "(512) 555-0100";
export const KR_PHONE_PLACEHOLDER = "010-1234-5678";
