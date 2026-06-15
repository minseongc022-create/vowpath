import Stripe from "stripe";
import { IS_BETA } from "./beta";
import type { PlanId } from "./constants";
import { isValidStripeEnvValue } from "./stripe-config";
import type { UserRecord } from "./users-db";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export type UserBilling = {
  plan?: PlanId;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
  flexBillableCount?: number;
  paidAt?: string;
};

export function mergeUserBilling(user: UserRecord): UserRecord & UserBilling {
  return user as UserRecord & UserBilling;
}

/** Beta or active subscription = entitled to product features. */
export function isEntitled(user: UserRecord | undefined | null): boolean {
  if (!user) return false;
  if (IS_BETA) return true;
  const b = mergeUserBilling(user);
  const status = b.subscriptionStatus ?? "none";
  return status === "active" || status === "trialing";
}

export function requiresEntitlement(): boolean {
  return !IS_BETA && isValidStripeEnvValue(process.env.STRIPE_SECRET_KEY);
}

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!isValidStripeEnvValue(key)) return null;
  return new Stripe(key!, { apiVersion: "2026-04-22.dahlia" });
}

export async function verifyCheckoutSession(
  sessionId: string,
): Promise<{
  ok: boolean;
  plan?: PlanId;
  customerId?: string;
  subscriptionId?: string;
  email?: string;
}> {
  const stripe = stripeClient();
  if (!stripe) return { ok: false };

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return { ok: false };
    }
    const plan = (session.metadata?.plan === "flex" ? "flex" : "unlimited") as PlanId;
    const sub =
      typeof session.subscription === "string"
        ? null
        : session.subscription;
    return {
      ok: true,
      plan,
      customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
      subscriptionId: sub?.id ?? (typeof session.subscription === "string" ? session.subscription : undefined),
      email: session.customer_details?.email ?? session.customer_email ?? undefined,
    };
  } catch (e) {
    console.error("[billing] verify session", e);
    return { ok: false };
  }
}

export async function createBillingPortalUrl(
  customerId: string,
  returnUrl: string,
): Promise<string | null> {
  const stripe = stripeClient();
  if (!stripe) return null;
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

export async function fetchNextBillingDate(customerId: string | undefined): Promise<string | null> {
  if (!customerId) return null;
  const stripe = stripeClient();
  if (!stripe) return null;
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const sub = subs.data[0] as Stripe.Subscription & { current_period_end?: number };
    const periodEnd = sub?.current_period_end;
    if (!periodEnd) return null;
    return new Date(periodEnd * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    console.warn("[billing] next billing date", e);
    return null;
  }
}

export async function recordFlexUsage(
  user: UserRecord,
): Promise<void> {
  const b = mergeUserBilling(user);
  if (b.plan !== "flex") return;
  const stripe = stripeClient();
  const priceId = process.env.STRIPE_PRICE_ID_FLEX_USAGE;
  if (!stripe || !isValidStripeEnvValue(priceId) || !b.stripeCustomerId) return;

  try {
    await stripe.invoiceItems.create({
      customer: b.stripeCustomerId,
      pricing: { price: priceId! },
      quantity: 1,
    });
  } catch (e) {
    console.warn("[billing] flex usage invoice item", e);
  }
}
