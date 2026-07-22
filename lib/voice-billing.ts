import { SITE, type PlanId } from "./constants";

export type PerMinutePlanId = "voice_starter" | "voice_pro";

export function isPerMinutePlan(plan: PlanId | undefined): plan is PerMinutePlanId {
  return plan === "voice_starter" || plan === "voice_pro";
}

export function includedMinutesForPlan(plan: PerMinutePlanId): number {
  return plan === "voice_starter"
    ? SITE.voiceStarterIncludedMinutes
    : SITE.voiceProIncludedMinutes;
}

/** Whole minutes billed per call — ceil(seconds/60). Documented on pricing. */
export function billableMinutesFromDurationSec(durationSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 0;
  return Math.ceil(durationSec / 60);
}

export function overagePerMinuteUsdForUser(
  plan: PerMinutePlanId,
  user: { discountCohort?: string; betaCohortSteppedAt?: string },
): number {
  const founder = user.discountCohort === "beta_feedback" && !user.betaCohortSteppedAt;
  const raw =
    plan === "voice_starter"
      ? founder
        ? SITE.betaVoiceStarterOveragePerMinute
        : SITE.voiceStarterOveragePerMinute
      : founder
        ? SITE.betaVoiceProOveragePerMinute
        : SITE.voiceProOveragePerMinute;
  return Number(raw.replace(/[^0-9.]/g, ""));
}

export function shouldBillVoiceOverage(
  plan: PerMinutePlanId,
  monthlyBillableMinutes: number,
): boolean {
  return monthlyBillableMinutes > includedMinutesForPlan(plan);
}

/** Minutes of this call that fall past the included cap (for usage billing quantity). */
export function overageMinutesFromCall(
  plan: PerMinutePlanId,
  minutesBeforeCall: number,
  callMinutes: number,
): number {
  if (callMinutes <= 0) return 0;
  const included = includedMinutesForPlan(plan);
  const after = minutesBeforeCall + callMinutes;
  if (after <= included) return 0;
  if (minutesBeforeCall >= included) return callMinutes;
  return after - included;
}
