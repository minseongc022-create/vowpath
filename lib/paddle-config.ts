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

/** $129/mo — feedback cohort rate for 5 years (vs $169/mo regular). */
export function betaCohortIntroPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_INTRO;
}

/** $169/mo — regular unlimited price after 5-year feedback cohort ends. */
export function betaCohortLockedPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_LOCKED;
}

/** $40/mo Flex base — feedback cohort rate (falls back to standard Flex price). */
export function betaCohortFlexIntroPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_FLEX ?? process.env.PADDLE_PRICE_ID_FLEX;
}

/** $9/dispatch — feedback cohort Flex usage (falls back to standard usage price). */
export function betaCohortFlexUsagePriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_FLEX_USAGE ?? process.env.PADDLE_PRICE_ID_FLEX_USAGE;
}

/** $49/mo Flex base after 5-year feedback cohort ends. */
export function betaCohortFlexLockedPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_FLEX_LOCKED ?? process.env.PADDLE_PRICE_ID_FLEX;
}

/** $11/dispatch after 5-year feedback cohort ends. */
export function betaCohortFlexLockedUsagePriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_FLEX_USAGE_LOCKED ?? process.env.PADDLE_PRICE_ID_FLEX_USAGE;
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
