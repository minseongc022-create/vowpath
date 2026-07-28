import { randomBytes } from "crypto";

/** 16 hex chars — short enough for one SMS segment with the portal URL. */
const TOKEN_BYTES = 8;

export function generateLinkIntakeToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Accept only full tokens (16 hex current, 32 hex legacy).
 * Truncated SMS fragments (e.g. 7–25 chars) must NOT look valid —
 * they miss KV and previously showed a false "link expired".
 */
export function normalizeLinkIntakeToken(raw: string | null | undefined): string | null {
  const token = raw?.trim().toLowerCase() ?? "";
  if (!token) return null;
  if (/^[a-f0-9]{16}$/.test(token) || /^[a-f0-9]{32}$/.test(token)) return token;
  return null;
}

/** Hex crumbs from a split SMS URL — guide the customer to open the full message. */
export function isLikelyTruncatedLinkToken(raw: string | null | undefined): boolean {
  const token = raw?.trim().toLowerCase() ?? "";
  if (!token) return false;
  if (/^[a-f0-9]{16}$/.test(token) || /^[a-f0-9]{32}$/.test(token)) return false;
  return /^[a-f0-9]{6,31}$/.test(token);
}
