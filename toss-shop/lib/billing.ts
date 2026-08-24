import type { TossShopAccount, TossShopPlan } from "./types";

export const PRO_PRICE_KRW = 10_000;
export const FREE_DAILY_KEYWORD_LIMIT = 3;
export const CONSIGNMENT_DAILY_PICKS = 15;

const TRIAL_DAYS = 30;

export type PlanTier = "owner" | "pro" | "free";

export type PlanAccess = {
  tier: PlanTier;
  label: string;
  fullAccess: boolean;
  dailyKeywordLimit: number | null;
  priceKrw: number | null;
  isOwner: boolean;
};

function ownerEmails(): string[] {
  const raw = process.env.TOSS_SHOP_OWNER_EMAILS?.trim();
  if (!raw) return [];
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isOwnerEmail(email: string): boolean {
  return ownerEmails().includes(email.toLowerCase());
}

export function resolvePlanForEmail(email: string): TossShopPlan {
  if (isOwnerEmail(email)) return "owner";
  return "free";
}

export function defaultTrialEndsAt(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d.toISOString();
}

export function normalizePlan(plan?: TossShopPlan): PlanTier {
  if (plan === "owner") return "owner";
  if (plan === "pro") return "pro";
  return "free";
}

export function getPlanAccess(
  account: Pick<
    TossShopAccount,
    "email" | "plan" | "trialEndsAt" | "proExpiresAt" | "subscriptionStatus"
  >,
): PlanAccess {
  if (isOwnerEmail(account.email) || account.plan === "owner") {
    return {
      tier: "owner",
      label: "Owner (무제한)",
      fullAccess: true,
      dailyKeywordLimit: null,
      priceKrw: null,
      isOwner: true,
    };
  }
  const lsActive =
    account.subscriptionStatus === "active" ||
    (account.subscriptionStatus === "past_due" && account.plan === "pro");
  if (lsActive) {
    return {
      tier: "pro",
      label: "Pro",
      fullAccess: true,
      dailyKeywordLimit: null,
      priceKrw: PRO_PRICE_KRW,
      isOwner: false,
    };
  }
  if (account.plan === "pro" && account.proExpiresAt && new Date(account.proExpiresAt).getTime() > Date.now()) {
    return {
      tier: "pro",
      label: "Pro",
      fullAccess: true,
      dailyKeywordLimit: null,
      priceKrw: PRO_PRICE_KRW,
      isOwner: false,
    };
  }
  // ⚠️ 만료일 없는 pro를 통과시키면 영구 무료가 된다.
  // 종전에는 `plan === "pro" && !proExpiresAt`를 fullAccess로 처리해서,
  // 만료일 없이 pro가 붙은 계정은 결제 없이 영원히 전체 기능을 썼다.
  // 유효한 Pro는 (a) 활성 구독 또는 (b) 미래 만료일 둘 중 하나여야 한다.
  return {
    tier: "free",
    label: "Free",
    fullAccess: false,
    dailyKeywordLimit: FREE_DAILY_KEYWORD_LIMIT,
    priceKrw: PRO_PRICE_KRW,
    isOwner: false,
  };
}

/** @deprecated use getPlanAccess().fullAccess */
export function isTossShopEntitled(account: Pick<TossShopAccount, "email" | "plan" | "trialEndsAt" | "proExpiresAt">): boolean {
  return getPlanAccess(account).fullAccess;
}

export function planLabel(plan?: TossShopPlan, email?: string): string {
  if (email && isOwnerEmail(email)) return "Owner";
  if (plan === "owner") return "Owner";
  if (plan === "pro") return "Pro";
  if (plan === "free") return "Free";
  return "Free";
}

export function dataSourceLabel(source?: string): string {
  if (source === "live") return "실시간 API";
  if (source === "live_partial") return "API (부분)";
  return "데모 데이터";
}

export function proExpiresAtFromNow(months = 1): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}
