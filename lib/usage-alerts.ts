import type { PlanId } from "./constants";
import { normalizePlanId, isCappedFlatPlan, isPerMinutePlan } from "./plan-pricing";
import { includedDispatchesForPlan } from "./dispatch-billing";
import { includedMinutesForPlan } from "./voice-billing";
import type { UserRecord } from "./users-db";
import { updateUserBilling } from "./users-db";
import { sendSms } from "./send-sms";
import { shouldSendSmsOnce, markSmsSent } from "./sms-dedupe";

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function usageForUser(user: UserRecord): {
  plan: PlanId;
  used: number;
  included: number;
  unit: "dispatches" | "minutes";
} | null {
  const plan = normalizePlanId(user.plan);
  const month = currentMonthKey();

  if (isCappedFlatPlan(plan)) {
    if (user.dispatchBillableMonth !== month) {
      return { plan, used: 0, included: includedDispatchesForPlan(plan), unit: "dispatches" };
    }
    return {
      plan,
      used: user.monthlyDispatchCount ?? 0,
      included: includedDispatchesForPlan(plan),
      unit: "dispatches",
    };
  }

  if (isPerMinutePlan(plan)) {
    if (user.voiceBillableMonth !== month) {
      return { plan, used: 0, included: includedMinutesForPlan(plan), unit: "minutes" };
    }
    return {
      plan,
      used: user.monthlyVoiceMinutes ?? 0,
      included: includedMinutesForPlan(plan),
      unit: "minutes",
    };
  }

  return null;
}

function alertBody(opts: {
  shopName?: string;
  threshold: 80 | 100;
  used: number;
  included: number;
  unit: "dispatches" | "minutes";
}): string {
  const shop = opts.shopName?.trim() || "Effiroad";
  const unitLabel = opts.unit === "minutes" ? "talk-minutes" : "dispatches";
  if (opts.threshold === 80) {
    return `${shop}: You've used ${opts.used} of ${opts.included} included ${unitLabel} this month (~80%). Overage starts after ${opts.included}. Manage plan in Settings.`;
  }
  return `${shop}: You've reached ${opts.included} included ${unitLabel} this month. Further usage bills as overage. Manage plan in Settings.`;
}

/**
 * Once per month per threshold — SMS owner when capped plan hits 80% or 100% of included.
 * Flex/Lite (uncapped per-dispatch) skip.
 */
export async function maybeNotifyUsageCap(user: UserRecord): Promise<void> {
  const usage = usageForUser(user);
  if (!usage || usage.included <= 0) return;

  const phone = user.phone?.trim();
  if (!phone) return;

  const month = currentMonthKey();
  const alertMonth = user.usageAlertMonth === month ? month : null;
  let sent80 = Boolean(alertMonth && user.usageAlert80Sent);
  let sent100 = Boolean(alertMonth && user.usageAlert100Sent);

  const ratio = usage.used / usage.included;
  const need80 = !sent80 && ratio >= 0.8;
  const need100 = !sent100 && ratio >= 1;

  if (!need80 && !need100) return;

  const patch: {
    usageAlertMonth: string;
    usageAlert80Sent?: boolean;
    usageAlert100Sent?: boolean;
  } = { usageAlertMonth: month };

  if (need80) {
    const dedupeId = `usage-alert-80:${month}:${usage.plan}`;
    const allowed = await shouldSendSmsOnce(user.id, dedupeId);
    if (allowed) {
      const result = await sendSms(
        phone,
        alertBody({
          shopName: user.shopName,
          threshold: 80,
          used: usage.used,
          included: usage.included,
          unit: usage.unit,
        }),
        "usage_cap_80",
        { context: { userId: user.id, operation: "usage_cap_80" } },
      );
      if (result.ok) {
        await markSmsSent(user.id, dedupeId);
        sent80 = true;
        patch.usageAlert80Sent = true;
      }
    } else {
      sent80 = true;
      patch.usageAlert80Sent = true;
    }
  }

  if (need100) {
    const dedupeId = `usage-alert-100:${month}:${usage.plan}`;
    const allowed = await shouldSendSmsOnce(user.id, dedupeId);
    if (allowed) {
      const result = await sendSms(
        phone,
        alertBody({
          shopName: user.shopName,
          threshold: 100,
          used: usage.used,
          included: usage.included,
          unit: usage.unit,
        }),
        "usage_cap_100",
        { context: { userId: user.id, operation: "usage_cap_100" } },
      );
      if (result.ok) {
        await markSmsSent(user.id, dedupeId);
        sent100 = true;
        patch.usageAlert100Sent = true;
      }
    } else {
      sent100 = true;
      patch.usageAlert100Sent = true;
    }
  }

  if (patch.usageAlert80Sent || patch.usageAlert100Sent) {
    // Reset sibling flags when month rolls — store both current states
    await updateUserBilling(user.id, {
      usageAlertMonth: month,
      usageAlert80Sent: sent80,
      usageAlert100Sent: sent100,
    });
  }
}

export type BillingUsageSummary = {
  track: "dispatch_per_job" | "dispatch_capped" | "voice_minutes" | "unknown";
  used: number;
  included: number | null;
  unit: "dispatches" | "minutes" | null;
  percent: number | null;
  month: string;
};

export function buildBillingUsageSummary(user: UserRecord): BillingUsageSummary {
  const plan = normalizePlanId(user.plan);
  const month = currentMonthKey();

  if (isPerMinutePlan(plan)) {
    const included = includedMinutesForPlan(plan);
    const used =
      user.voiceBillableMonth === month ? (user.monthlyVoiceMinutes ?? 0) : 0;
    return {
      track: "voice_minutes",
      used,
      included,
      unit: "minutes",
      percent: included > 0 ? Math.min(999, Math.round((used / included) * 100)) : null,
      month,
    };
  }

  if (isCappedFlatPlan(plan)) {
    const included = includedDispatchesForPlan(plan);
    const used =
      user.dispatchBillableMonth === month ? (user.monthlyDispatchCount ?? 0) : 0;
    return {
      track: "dispatch_capped",
      used,
      included,
      unit: "dispatches",
      percent: included > 0 ? Math.min(999, Math.round((used / included) * 100)) : null,
      month,
    };
  }

  if (plan === "flex" || plan === "lite") {
    const used =
      user.dispatchBillableMonth === month ? (user.monthlyDispatchCount ?? 0) : 0;
    return {
      track: "dispatch_per_job",
      used,
      included: null,
      unit: "dispatches",
      percent: null,
      month,
    };
  }

  return {
    track: "unknown",
    used: 0,
    included: null,
    unit: null,
    percent: null,
    month,
  };
}
