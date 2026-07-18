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
  if (plan === "flex") return process.env.PADDLE_PRICE_ID_FLEX;
  if (plan === "lite") return process.env.PADDLE_PRICE_ID_LITE;
  if (plan === "scale") return process.env.PADDLE_PRICE_ID_SCALE;
  return process.env.PADDLE_PRICE_ID_PRO ?? process.env.PADDLE_PRICE_ID_UNLIMITED;
}

export function usagePriceIdForPlan(plan: "flex" | "lite"): string | undefined {
  return plan === "flex"
    ? process.env.PADDLE_PRICE_ID_FLEX_USAGE
    : process.env.PADDLE_PRICE_ID_LITE_USAGE;
}

export function cappedOveragePriceIdForPlan(
  plan: "pro" | "scale",
  user?: { discountCohort?: string; betaCohortSteppedAt?: string },
): string | undefined {
  if (plan === "pro") {
    return process.env.PADDLE_PRICE_ID_PRO_OVERAGE;
  }
  const founder = user?.discountCohort === "beta_feedback" && !user?.betaCohortSteppedAt;
  if (founder && process.env.PADDLE_PRICE_ID_BETA_SCALE_OVERAGE) {
    return process.env.PADDLE_PRICE_ID_BETA_SCALE_OVERAGE;
  }
  return process.env.PADDLE_PRICE_ID_SCALE_OVERAGE;
}

/** $129/mo Pro — feedback cohort for 5 years. */
export function betaCohortIntroPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_INTRO;
}

/** $349/mo Scale — feedback cohort for 5 years. */
export function betaCohortScaleIntroPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_SCALE;
}

/** $169/mo Pro after 5-year feedback cohort ends. */
export function betaCohortLockedPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_LOCKED ?? process.env.PADDLE_PRICE_ID_PRO;
}

/** $369/mo Scale after cohort (same as list price). */
export function betaCohortScaleLockedPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_SCALE;
}

export function betaCohortFlexIntroPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_FLEX ?? process.env.PADDLE_PRICE_ID_FLEX;
}

export function betaCohortFlexUsagePriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_FLEX_USAGE ?? process.env.PADDLE_PRICE_ID_FLEX_USAGE;
}

export function betaCohortFlexLockedPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_FLEX_LOCKED ?? process.env.PADDLE_PRICE_ID_FLEX;
}

export function betaCohortFlexLockedUsagePriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_FLEX_USAGE_LOCKED ?? process.env.PADDLE_PRICE_ID_FLEX_USAGE;
}

export function betaCohortLiteIntroPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_LITE ?? process.env.PADDLE_PRICE_ID_LITE;
}

export function betaCohortLiteUsagePriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_LITE_USAGE ?? process.env.PADDLE_PRICE_ID_LITE_USAGE;
}

export function betaCohortLiteLockedPriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_LITE_LOCKED ?? process.env.PADDLE_PRICE_ID_LITE;
}

export function betaCohortLiteLockedUsagePriceId(): string | undefined {
  return process.env.PADDLE_PRICE_ID_BETA_LITE_USAGE_LOCKED ?? process.env.PADDLE_PRICE_ID_LITE_USAGE;
}

export function betaCohortIntroPriceIdForPlan(plan: PlanId): string | undefined {
  if (plan === "flex") return betaCohortFlexIntroPriceId();
  if (plan === "lite") return betaCohortLiteIntroPriceId();
  if (plan === "scale") return betaCohortScaleIntroPriceId();
  return betaCohortIntroPriceId();
}

export function betaCohortLockedPriceIdForPlan(plan: PlanId): string | undefined {
  if (plan === "flex") return betaCohortFlexLockedPriceId();
  if (plan === "lite") return betaCohortLiteLockedPriceId();
  if (plan === "scale") return betaCohortScaleLockedPriceId();
  return betaCohortLockedPriceId();
}

export function betaCohortUsagePriceIdForPlan(
  plan: "flex" | "lite",
  stepped: boolean,
): string | undefined {
  if (plan === "flex") {
    return stepped ? betaCohortFlexLockedUsagePriceId() : betaCohortFlexUsagePriceId();
  }
  return stepped ? betaCohortLiteLockedUsagePriceId() : betaCohortLiteUsagePriceId();
}

export function isPaddleConfigured(plan: PlanId = "pro"): boolean {
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
