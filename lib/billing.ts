import { IS_BETA } from "./beta";
import { trialHardCutoff } from "./billing-cohort";
import type { PlanId } from "./constants";
import { normalizePlanId, isPerDispatchPlan, isPerMinutePlan } from "./plan-pricing";
import {
  isCappedFlatPlan,
  shouldBillDispatchOverage,
} from "./dispatch-billing";
import {
  billableMinutesFromDurationSec,
  overageMinutesFromCall,
} from "./voice-billing";
import {
  betaCohortFlexUsageVariantId,
  betaCohortLiteUsageVariantId,
  isValidLsEnvValue,
  planFromVariantId,
  usageVariantIdForPlan,
  usageVariantIdsForPlan,
} from "./lemon-squeezy-config";
import {
  fetchSubscription,
  listSubscriptionItems,
  reportUsageIncrement,
} from "./lemon-squeezy-client";
import type { UserRecord } from "./users-db";
import { incrementVoiceBillableMinutes } from "./users-db";
import { claimVoiceCallBilling } from "./voice-meter-dedupe";
import { isCallPathEstimate } from "./call-path-meter";
import { maybeNotifyUsageCap } from "./usage-alerts";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled";

export type UserBilling = {
  plan?: PlanId;
  lsCustomerId?: string;
  lsSubscriptionId?: string;
  /** Subscription item id for usage/overage reporting */
  lsUsageItemId?: string;
  subscriptionStatus?: SubscriptionStatus;
  flexBillableCount?: number;
  paidAt?: string;
};

export function mergeUserBilling(user: UserRecord): UserRecord & UserBilling {
  return user as UserRecord & UserBilling;
}

function billingCustomerId(user: UserRecord): string | undefined {
  return user.lsCustomerId ?? user.paddleCustomerId;
}

function billingSubscriptionId(user: UserRecord): string | undefined {
  return user.lsSubscriptionId ?? user.paddleSubscriptionId;
}

function billingUsageItemId(user: UserRecord): string | undefined {
  return user.lsUsageItemId;
}

/**
 * Product + phone/SMS access.
 * Beta: open. LS off (local dev): open. Production: active subscription or valid trial only.
 */
export function isEntitled(user: UserRecord | undefined | null): boolean {
  if (!user) return false;
  if (IS_BETA) return true;
  if (!requiresEntitlement()) return true;

  const b = mergeUserBilling(user);
  const status = b.subscriptionStatus ?? "none";

  if (status === "active") return true;
  if (status === "past_due") return true;

  if (status === "trialing") {
    if (!b.trialEndsAt) return false;
    return trialHardCutoff(b.trialEndsAt) > Date.now();
  }

  return false;
}

export function requiresEntitlement(): boolean {
  return !IS_BETA && isValidLsEnvValue(process.env.LEMON_SQUEEZY_API_KEY);
}

function mapLsStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
    case "on_trial":
      return status === "on_trial" ? "trialing" : "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "paused":
      return "paused";
    case "cancelled":
    case "expired":
      return "canceled";
    default:
      return "past_due";
  }
}

/** Sync billing after redirect (webhook is primary). */
export async function verifyCheckoutReturn(opts: {
  subscriptionId?: string;
  planHint?: PlanId;
}): Promise<{
  ok: boolean;
  plan?: PlanId;
  customerId?: string;
  subscriptionId?: string;
  email?: string;
  usageItemId?: string;
}> {
  const subscriptionId = opts.subscriptionId?.trim();
  if (!subscriptionId) return { ok: false };

  const sub = await fetchSubscription(subscriptionId);
  if (!sub) return { ok: false };

  const status = sub.attributes.status;
  if (status !== "active" && status !== "on_trial") {
    return { ok: false };
  }

  const plan =
    opts.planHint ??
    planFromVariantId(String(sub.attributes.variant_id)) ??
    normalizePlanId(undefined);
  const usageItemId = await resolveUsageItemForPlan(subscriptionId, plan);

  return {
    ok: true,
    plan,
    customerId: String(sub.attributes.customer_id),
    subscriptionId,
    email: sub.attributes.user_email,
    usageItemId,
  };
}

async function resolveUsageItemForPlan(
  subscriptionId: string,
  plan: PlanId,
): Promise<string | undefined> {
  const items = await listSubscriptionItems(subscriptionId);
  if (items.length === 0) return undefined;
  const usageVariants = new Set(
    [
      ...usageVariantIdsForPlan(plan),
    ],
  );
  for (const item of items) {
    const variantId = item.variant_id != null ? String(item.variant_id) : "";
    if (usageVariants.has(variantId)) return String(item.id);
  }
  return items.length > 1 ? String(items[items.length - 1].id) : undefined;
}

/** @deprecated Paddle transaction id — no-op for Lemon Squeezy */
export async function verifyTransaction(_transactionId: string): Promise<{
  ok: boolean;
  plan?: PlanId;
  customerId?: string;
  subscriptionId?: string;
  email?: string;
}> {
  return { ok: false };
}

export async function createBillingPortalUrl(subscriptionId: string): Promise<string | null> {
  const sub = await fetchSubscription(subscriptionId);
  return (
    sub?.attributes.urls?.customer_portal ??
    sub?.attributes.urls?.update_payment_method ??
    null
  );
}

export async function fetchNextBillingDate(
  subscriptionId: string | undefined,
): Promise<string | null> {
  if (!subscriptionId) return null;
  const sub = await fetchSubscription(subscriptionId);
  const renewsAt = sub?.attributes.renews_at;
  if (!renewsAt) return null;
  return new Date(renewsAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function chargeUsage(user: UserRecord, quantity: number): Promise<void> {
  if (quantity <= 0) return;
  const usageItemId = billingUsageItemId(user);
  if (!usageItemId) return;
  try {
    await reportUsageIncrement(usageItemId, quantity);
  } catch (e) {
    console.warn("[billing] usage record", e);
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
    if (!shouldBillDispatchOverage(b.plan, effectiveCount)) {
      try {
        await maybeNotifyUsageCap(user);
      } catch (e) {
        console.warn("[billing] dispatch usage alert", e);
      }
      return;
    }
    await chargeUsage(user, 1);
    try {
      await maybeNotifyUsageCap(user);
    } catch (e) {
      console.warn("[billing] dispatch usage alert", e);
    }
  }
}

async function chargePerDispatchPlan(user: UserRecord, plan: "flex" | "lite") {
  const b = mergeUserBilling(user);
  if (!billingSubscriptionId(user)) return;

  const inFeedbackCohort =
    user.discountCohort === "beta_feedback" && !user.betaCohortSteppedAt;
  const usageVariantConfigured = inFeedbackCohort
    ? plan === "flex"
      ? betaCohortFlexUsageVariantId()
      : betaCohortLiteUsageVariantId()
    : usageVariantIdForPlan(plan);

  if (!isValidLsEnvValue(usageVariantConfigured)) return;
  await chargeUsage(user, 1);
}

export async function recordVoiceCallUsage(opts: {
  user: UserRecord;
  callSid: string;
  durationSec?: number;
}): Promise<void> {
  const plan = normalizePlanId(opts.user.plan);
  if (!isPerMinutePlan(plan)) return;

  if (await isCallPathEstimate(opts.callSid)) return;

  const minutes = billableMinutesFromDurationSec(opts.durationSec ?? 0);
  if (minutes <= 0) return;

  const claim = await claimVoiceCallBilling(opts.user.id, opts.callSid);
  if (claim === "already") return;

  const bumped = await incrementVoiceBillableMinutes(opts.user.id, minutes);
  if (!bumped) return;

  const overage = overageMinutesFromCall(plan, bumped.minutesBefore, minutes);
  if (overage > 0) {
    await chargeUsage(bumped.user, overage);
  }

  try {
    await maybeNotifyUsageCap(bumped.user);
  } catch (e) {
    console.warn("[billing] voice usage alert", e);
  }
}

export { mapLsStatus, billingCustomerId, billingSubscriptionId };
