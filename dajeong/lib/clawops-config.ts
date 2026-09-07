export const CLAWOPS_REQUIRED_ENV = [
  "CLAWOPS_API_KEY",
  "CLAWOPS_ACCOUNT_ID",
  "CLAWOPS_FROM_NUMBER",
  "CLAWOPS_AGENT_ID",
  "CLAWOPS_SIGNING_KEY",
] as const;

export type ClawOpsRequiredEnv = (typeof CLAWOPS_REQUIRED_ENV)[number];

export function clawOpsReadiness(env: NodeJS.ProcessEnv = process.env): {
  configured: boolean;
  missing: ClawOpsRequiredEnv[];
  invalid: ClawOpsRequiredEnv[];
} {
  const missing = CLAWOPS_REQUIRED_ENV.filter((key) => !env[key]?.trim());
  const invalid: ClawOpsRequiredEnv[] = [];
  if (env.CLAWOPS_FROM_NUMBER?.trim()) {
    try {
      normalizeClawOpsFromNumber(env.CLAWOPS_FROM_NUMBER);
    } catch {
      invalid.push("CLAWOPS_FROM_NUMBER");
    }
  }
  return { configured: missing.length === 0 && invalid.length === 0, missing, invalid };
}

/**
 * ClawOps account-owned Korean numbers are documented in domestic form
 * (070...). Accept E.164 as an operator-friendly input too, then send the
 * canonical domestic form expected by the Calls API.
 */
export function normalizeClawOpsFromNumber(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^0\d{8,10}$/.test(compact)) return compact;
  if (/^\+82\d{8,11}$/.test(compact)) return `0${compact.slice(3)}`;
  throw new Error("CLAWOPS_FROM_NUMBER_MUST_BE_KOREAN_OWNED_NUMBER");
}

export function reservationWorkerCapacity(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.HARUWITH_RESERVATION_CONCURRENCY ?? "1");
  return Number.isFinite(parsed) ? Math.max(1, Math.min(50, Math.floor(parsed))) : 1;
}

export function monthlyMinuteAllowance(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.HARUWITH_MONTHLY_MINUTE_ALLOWANCE ?? "100");
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 100;
}
