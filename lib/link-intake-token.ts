import { randomBytes } from "crypto";

/** 16 hex chars — short enough for one SMS segment with the portal URL. */
const TOKEN_BYTES = 8;

export function generateLinkIntakeToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

/** Accept legacy 32-char tokens and reject obvious garbage from split SMS URLs. */
export function normalizeLinkIntakeToken(raw: string | null | undefined): string | null {
  const token = raw?.trim().toLowerCase() ?? "";
  if (!token) return null;
  if (!/^[a-f0-9]{12,32}$/.test(token)) return null;
  return token;
}
