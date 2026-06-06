import { normalizePhone } from "../parse-contact";

/**
 * Twilio Caller ID is authoritative. Spoken numbers are ignored unless
 * explicitly collected in a dedicated callback step (not used in MVP).
 */
export function resolveCallbackFromCallerId(twilioFrom: string): string {
  const normalized = normalizePhone(twilioFrom);
  if (normalized && normalized.length >= 10) return normalized;
  const digits = twilioFrom.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.length === 10 ? `+1${digits}` : `+${digits}`;
  }
  return twilioFrom.trim() || "unknown";
}

export function formatCallbackForSpeech(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  const ten =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.slice(-10);
  if (ten.length !== 10) return e164;
  return `${ten.slice(0, 3)}, ${ten.slice(3, 6)}, ${ten.slice(6)}`;
}
