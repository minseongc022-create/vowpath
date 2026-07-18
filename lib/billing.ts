import { IS_BETA } from "./beta";
import { trialHardCutoff } from "./billing-cohort";
import type { PlanId } from "./constants";
import { isPerDispatchPlan } from "./plan-pricing";
import {
  betaCohortFlexUsagePriceId,
  betaCohortLiteUsagePriceId,
  betaCohortFlexLockedUsagePriceId,
  betaCohortLiteLockedUsagePriceId,
  isValidPaddleEnvValue,
  usagePriceIdForPlan,
} from "./paddle-config";
import { paddleFetch } from "./paddle-client";
import type { UserRecord } from "./users-db";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled";

export type UserBilling = {
  plan?: PlanId;
  paddleCustomerId?: string;
  paddleSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
  flexBillableCount?: number;
  paidAt?: string;
};

export function mergeUserBilling(user: UserRecord): UserRecord & UserBilling {
  return user as UserRecord & UserBilling;
}

/**
 * Product + phone/SMS access.
 * Beta: open. Paddle off (local dev): open. Production: active subscription or valid beta trial only.
 */
export function isEntitled(user: UserRecord | undefined | null): boolean {
  if (!user) return false;
  if (IS_BETA) return true;
  if (!requiresEntitlement()) return true;

  const b = mergeUserBilling(user);
  const status = b.subscriptionStatus ?? "none";

  if (status === "active") return true;

  // Paddle past_due: keep access briefly while dunning (subscription still exists).
  if (status === "past_due") return true;

  if (status === "trialing") {
    if (!b.trialEndsAt) return false;
    // Entitled through the trial AND the short grace window after it; hard-cut
    // once the grace period lapses (unpaid = no access, no exceptions).
    return trialHardCutoff(b.trialEndsAt) > Date.now();
  }

  return false;
}

export function requiresEntitlement(): boolean {
  return !IS_BETA && isValidPaddleEnvValue(process.env.PADDLE_API_KEY);
}

type PaddleTransactionDetail = {
  status: string;
  customer_id?: string;
  subscription_id?: string;
  custom_data?: Record<string, unknown> | null;
};

/** Confirms a Paddle transaction completed and resolves the buyer's plan/customer/subscription. */
export async function verifyTransaction(transactionId: string): Promise<{
  ok: boolean;
  plan?: PlanId;
  customerId?: string;
  subscriptionId?: string;
  email?: string;
}> {
  try {
    const result = await paddleFetch<{ data: PaddleTransactionDetail }>(
      `/transactions/${transactionId}`,
    );
    const tx = result.data;
    if (tx.status !== "completed" && tx.status !== "paid") {
      return { ok: false };
    }

    const planRaw = tx.custom_data?.plan;
    const plan: PlanId =
      planRaw === "flex" || planRaw === "lite" || planRaw === "unlimited"
        ? planRaw
        : "unlimited";
    let email: string | undefined;
    if (tx.customer_id) {
      try {
        const customer = await paddleFetch<{ data: { email?: string } }>(
          `/customers/${tx.customer_id}`,
        );
        email = customer.data?.email;
      } catch (e) {
        console.warn("[billing] customer lookup", e);
      }
    }

    return {
      ok: true,
      plan,
      customerId: tx.customer_id,
      subscriptionId: tx.subscription_id,
      email,
    };
  } catch (e) {
    console.error("[billing] verify transaction", e);
    return { ok: false };
  }
}

/** Fetched fresh each call — Paddle's management_urls are short-lived tokens, never cache. */
export async function createBillingPortalUrl(
  subscriptionId: string,
): Promise<string | null> {
  try {
    const result = await paddleFetch<{
      data: { management_urls?: { update_payment_method?: string; cancel?: string } };
    }>(`/subscriptions/${subscriptionId}`);
    return (
      result.data.management_urls?.update_payment_method ??
      result.data.management_urls?.cancel ??
      null
    );
  } catch (e) {
    console.warn("[billing] portal url", e);
    return null;
  }
}

export async function fetchNextBillingDate(
  customerId: string | undefined,
): Promise<string | null> {
  if (!customerId) return null;
  try {
    const result = await paddleFetch<{
      data: Array<{ next_billed_at?: string; status: string }>;
    }>(`/subscriptions?customer_id=${customerId}&status=active`);
    const sub = result.data[0];
    if (!sub?.next_billed_at) return null;
    return new Date(sub.next_billed_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    console.warn("[billing] next billing date", e);
    return null;
  }
}

/** Per-dispatch plan overage — billed on the next renewal. */
export async function recordFlexUsage(user: UserRecord): Promise<void> {
  const b = mergeUserBilling(user);
  if (!isPerDispatchPlan(b.plan)) return;

  const inFeedbackCohort =
    user.discountCohort === "beta_feedback" && !user.betaCohortSteppedAt;
  const stepped = user.discountCohort === "beta_feedback" && Boolean(user.betaCohortSteppedAt);
  const priceId = inFeedbackCohort
    ? b.plan === "flex"
      ? betaCohortFlexUsagePriceId()
      : betaCohortLiteUsagePriceId()
    : stepped
      ? b.plan === "flex"
        ? betaCohortFlexLockedUsagePriceId()
        : betaCohortLiteLockedUsagePriceId()
      : usagePriceIdForPlan(b.plan);

  if (!isValidPaddleEnvValue(priceId) || !b.paddleSubscriptionId) return;

  try {
    await paddleFetch(`/subscriptions/${b.paddleSubscriptionId}/charge`, {
      method: "POST",
      body: {
        effective_from: "next_billing_period",
        items: [{ price_id: priceId, quantity: 1 }],
      },
    });
  } catch (e) {
    console.warn("[billing] flex usage charge", e);
  }
}
