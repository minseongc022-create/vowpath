import Stripe from "stripe";
import { ROUTES, type PlanId } from "@/lib/constants";
import {
  allowCheckoutFallback,
  isStripeConfigured,
  paymentLinkForPlan,
} from "@/lib/stripe-config";

export class CheckoutUnavailableError extends Error {
  constructor(message = "결제를 시작할 수 없습니다.") {
    super(message);
    this.name = "CheckoutUnavailableError";
  }
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function priceIdForPlan(plan: PlanId): string | undefined {
  if (plan === "flex") {
    return process.env.STRIPE_PRICE_ID_FLEX ?? process.env.STRIPE_PRICE_ID;
  }
  return (
    process.env.STRIPE_PRICE_ID_UNLIMITED ?? process.env.STRIPE_PRICE_ID
  );
}

export function parsePlanId(value: unknown): PlanId {
  return value === "flex" ? "flex" : "unlimited";
}

/** Stripe Checkout · Payment Link · (개발) 회원가입 폴백 URL */
export async function getCheckoutRedirectUrl(plan: PlanId): Promise<string> {
  const paymentLink = paymentLinkForPlan(plan);
  if (paymentLink) {
    return paymentLink;
  }

  if (!isStripeConfigured(plan)) {
    if (allowCheckoutFallback()) {
      const signup = new URL(ROUTES.signup, appUrl());
      signup.searchParams.set("plan", plan);
      return signup.toString();
    }
    throw new CheckoutUnavailableError(
      "결제 시스템을 준비 중입니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = priceIdForPlan(plan);
  if (!secretKey || !priceId) {
    throw new CheckoutUnavailableError("결제 설정이 완료되지 않았습니다.");
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-04-22.dahlia" });
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/settings?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
    cancel_url: `${appUrl()}/get-started?canceled=1&plan=${plan}`,
    metadata: { product: "effiroad-hvac", plan },
    subscription_data: { metadata: { plan } },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new CheckoutUnavailableError("Checkout URL을 생성하지 못했습니다.");
  }

  return session.url;
}
