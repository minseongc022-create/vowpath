import type { TossShopAccount, TossShopPlan } from "./types";

const TRIAL_DAYS = 30;

export function defaultTrialEndsAt(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d.toISOString();
}

export function isTossShopEntitled(account: Pick<TossShopAccount, "plan" | "trialEndsAt">): boolean {
  if (account.plan === "pro" || account.plan === "free") return true;
  if (!account.trialEndsAt) return true;
  return new Date(account.trialEndsAt).getTime() > Date.now();
}

export function planLabel(plan?: TossShopPlan): string {
  if (plan === "pro") return "Pro";
  if (plan === "free") return "Free";
  return "Trial";
}

export function dataSourceLabel(source?: string): string {
  if (source === "live") return "실시간 API";
  if (source === "live_partial") return "API (부분)";
  return "데모 데이터";
}
