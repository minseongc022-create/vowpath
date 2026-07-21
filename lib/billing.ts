import { IS_BETA } from "./beta";
import { trialHardCutoff } from "./billing-cohort";
import type { PlanId } from "./constants";
import { normalizePlanId, isPerDispatchPlan, isPerMinutePlan } from "./plan-pricing";
import type { CappedFlatPlanId } from "./dispatch-billing";
import {
  isCappedFlatPlan,
  shouldBillDispatchOverage,
} from "./dispatch-billing";
import type { PerMinutePlanId } from "./voice-billing";
import {
  billableMinutesFromDurationSec,
  overageMinutesFromCall,
} from "./voice-billing";
import {
  betaCohortFlexLockedUsagePriceId,
  betaCohortFlexUsagePriceId,
  betaCohortLiteLockedUsagePriceId,
  betaCohortLiteUsagePriceId,
  cappedOveragePriceIdForPlan,
  isValidPaddleEnvValue,
  usagePriceIdForPlan,
  voiceOveragePriceIdForPlan,
} from "./paddle-config";
import { paddleFetch } from "./paddle-client";
import type { UserRecord } from "./users-db";
import { incrementVoiceBillableMinutes } from "./users-db";
import { claimVoiceCallBilling } from "./voice-meter-dedupe";

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

    const plan = normalizePlanId(tx.custom_data?.plan);
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

/** Per-dispatch billing — Flex/Lite always; Pro/Scale only beyond included monthly cap. */
export async function recordFlexUsage(user: UserRecord): Promise<void> {
  const b = mergeUserBilling(user);
  if (!b.plan) return;

  if (isPerDispatchPlan(b.plan)) {
    await chargePerDispatchPlan(user, b.plan);
    return;
  }

  if (isCappedFlatPlan(b.plan)) {
    const monthKey = user.dispatchBillableMonth;
    const count = user.monthlyDispatchCount ?? 0;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const effectiveCount = monthKey === currentMonth ? count : 0;
    if (!shouldBillDispatchOverage(b.plan, effectiveCount)) return;
    await chargeCappedOverage(user, b.plan);
  }
}

async function chargePerDispatchPlan(user: UserRecord, plan: "flex" | "lite") {
  const b = mergeUserBilling(user);
  const inFeedbackCohort =
    user.discountCohort === "beta_feedback" && !user.betaCohortSteppedAt;
  const stepped = user.discountCohort === "beta_feedback" && Boolean(user.betaCohortSteppedAt);
  const priceId = inFeedbackCohort
    ? plan === "flex"
      ? betaCohortFlexUsagePriceId()
      : betaCohortLiteUsagePriceId()
    : stepped
      ? plan === "flex"
        ? betaCohortFlexLockedUsagePriceId()
        : betaCohortLiteLockedUsagePriceId()
      : usagePriceIdForPlan(plan);

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
    console.warn("[billing] per-dispatch charge", e);
  }
}

async function chargeCappedOverage(user: UserRecord, plan: CappedFlatPlanId) {
  const b = mergeUserBilling(user);
  const priceId = cappedOveragePriceIdForPlan(plan, user);
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
    console.warn("[billing] capped overage charge", e);
  }
}

async function chargeVoiceOverageMinutes(
  user: UserRecord,
  plan: PerMinutePlanId,
  quantity: number,
) {
  if (quantity <= 0) return;
  const b = mergeUserBilling(user);
  const priceId = voiceOveragePriceIdForPlan(plan, user);
  if (!isValidPaddleEnvValue(priceId) || !b.paddleSubscriptionId) return;

  try {
    await paddleFetch(`/subscriptions/${b.paddleSubscriptionId}/charge`, {
      method: "POST",
      body: {
        effective_from: "next_billing_period",
        items: [{ price_id: priceId, quantity }],
      },
    });
  } catch (e) {
    console.warn("[billing] voice overage charge", e);
  }
}

/**
 * Meter a completed inbound call for per-minute plans.
 * Idempotent per CallSid. Does nothing for dispatch-billing plans.
 */
export async function recordVoiceCallUsage(opts: {
  user: UserRecord;
  callSid: string;
  durationSec?: number;
}): Promise<void> {
  const plan = normalizePlanId(opts.user.plan);
  if (!isPerMinutePlan(plan)) return;

  const minutes = billableMinutesFromDurationSec(opts.durationSec ?? 0);
  if (minutes <= 0) return;

  const claim = await claimVoiceCallBilling(opts.user.id, opts.callSid);
  if (claim === "already") return;

  const bumped = await incrementVoiceBillableMinutes(opts.user.id, minutes);
  if (!bumped) return;

  const overage = overageMinutesFromCall(plan, bumped.minutesBefore, minutes);
  if (overage > 0) {
    await chargeVoiceOverageMinutes(bumped.user, plan, overage);
  }
}
