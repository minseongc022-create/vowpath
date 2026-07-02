import type { PlanId } from "@/lib/constants";

const PLACEHOLDER_MARKERS = ["xxxx", "change-me", "your_", "pri_xxxx", "pdl_xxxx"];

export function isValidPaddleEnvValue(value?: string): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  if (PLACEHOLDER_MARKERS.some((m) => v.includes(m))) return false;
  return true;
}

export function paddleApiBaseUrl(): string {
  return process.env.PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

export function priceIdForPlan(plan: PlanId): string | undefined {
  return plan === "flex"
    ? process.env.PADDLE_PRICE_ID_FLEX
    : process.env.PADDLE_PRICE_ID_UNLIMITED;
}

/** $129/mo — first 6 months for trial users who give feedback when their trial ends. */
export function betaCohortIntroPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_INTRO;
}

/** $159/mo — where the beta_feedback cohort's price steps to after their 6-month intro period. */
export function betaCohortLockedPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_LOCKED;
}

export function isPaddleConfigured(plan: PlanId = "unlimited"): boolean {
  const key = process.env.PADDLE_API_KEY;
  const priceId = priceIdForPlan(plan);
  return isValidPaddleEnvValue(key) && isValidPaddleEnvValue(priceId);
}

export function allowCheckoutFallback(): boolean {
  return (
    process.env.ALLOW_DEMO_CHECKOUT === "true" ||
    process.env.NODE_ENV === "development"
  );
}
