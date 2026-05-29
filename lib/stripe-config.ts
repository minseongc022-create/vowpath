import type { PlanId } from "@/lib/constants";

const PLACEHOLDER_MARKERS = [
  "xxxx",
  "change-me",
  "your_",
  "sk_test_xxxx",
  "price_xxxx",
  "unlimited_xxxx",
  "flex_xxxx",
];

export function isValidStripeEnvValue(value?: string): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  if (PLACEHOLDER_MARKERS.some((m) => v.includes(m))) return false;
  return true;
}

export function paymentLinkForPlan(plan: PlanId): string | undefined {
  const link =
    plan === "flex"
      ? process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_FLEX
      : process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
  return isValidStripeEnvValue(link) ? link!.trim() : undefined;
}

export function isStripeConfigured(plan: PlanId = "unlimited"): boolean {
  if (paymentLinkForPlan(plan)) return true;

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId =
    plan === "flex"
      ? process.env.STRIPE_PRICE_ID_FLEX ?? process.env.STRIPE_PRICE_ID
      : process.env.STRIPE_PRICE_ID_UNLIMITED ?? process.env.STRIPE_PRICE_ID;

  return isValidStripeEnvValue(secret) && isValidStripeEnvValue(priceId);
}

export function allowCheckoutFallback(): boolean {
  return (
    process.env.ALLOW_DEMO_CHECKOUT === "true" ||
    process.env.NODE_ENV === "development"
  );
}
