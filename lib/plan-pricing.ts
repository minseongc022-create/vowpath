import { DEFAULT_PLAN, SITE, type PlanId } from "./constants";
import { isPerMinutePlan, type PerMinutePlanId } from "./voice-billing";

/**
 * Client-safe plan display helpers only.
 * Do not import server modules (users-db / dispatch-billing) here —
 * marketing content pulls this into the browser bundle.
 */

export function normalizePlanId(raw: unknown): PlanId {
  if (
    raw === "lite" ||
    raw === "flex" ||
    raw === "pro" ||
    raw === "scale" ||
    raw === "voice_starter" ||
    raw === "voice_pro"
  ) {
    return raw;
  }
  if (raw === "unlimited") return "pro";
  return DEFAULT_PLAN;
}

/** @deprecated use normalizePlanId */
export function parsePlanIdFromQuery(value: unknown): PlanId {
  return normalizePlanId(value);
}

export function isPerDispatchPlan(plan: PlanId | undefined): plan is "flex" | "lite" {
  return plan === "flex" || plan === "lite";
}

export function isCappedFlatPlan(plan: PlanId | undefined): plan is "pro" | "scale" {
  return plan === "pro" || plan === "scale";
}

/** Dispatch-billed SKUs (not per-minute). */
export function isDispatchBillingPlan(
  plan: PlanId | undefined,
): plan is "lite" | "flex" | "pro" | "scale" {
  return isPerDispatchPlan(plan) || isCappedFlatPlan(plan);
}

export { isPerMinutePlan };
export type { PerMinutePlanId };

export function founderRateLabel(plan: PlanId): string {
  if (plan === "pro") return `${SITE.betaIntroPrice}/mo`;
  if (plan === "scale") return `${SITE.betaScalePrice}/mo`;
  if (plan === "flex") {
    return `${SITE.betaFlexBasePrice}/mo + ${SITE.betaFlexPerBooking} per dispatch`;
  }
  if (plan === "voice_starter") {
    return `${SITE.betaVoiceStarterPrice}/mo · ${SITE.voiceStarterIncludedMinutes} min · then ${SITE.betaVoiceStarterOveragePerMinute}/min`;
  }
  if (plan === "voice_pro") {
    return `${SITE.betaVoiceProPrice}/mo · ${SITE.voiceProIncludedMinutes} min · then ${SITE.betaVoiceProOveragePerMinute}/min`;
  }
  return `${SITE.betaLiteBasePrice}/mo + ${SITE.betaLitePerBooking} per dispatch`;
}

export function regularRateLabel(plan: PlanId): string {
  if (plan === "pro") {
    return `${SITE.proPrice}/mo (${SITE.proIncludedDispatches} dispatches incl.)`;
  }
  if (plan === "scale") {
    return `${SITE.scalePrice}/mo (${SITE.scaleIncludedDispatches} dispatches incl.)`;
  }
  if (plan === "flex") {
    return `${SITE.flexBasePrice}/mo + ${SITE.flexPerBooking} per dispatch`;
  }
  if (plan === "voice_starter") {
    return `${SITE.voiceStarterPrice}/mo (${SITE.voiceStarterIncludedMinutes} min incl.)`;
  }
  if (plan === "voice_pro") {
    return `${SITE.voiceProPrice}/mo (${SITE.voiceProIncludedMinutes} min incl.)`;
  }
  return `${SITE.liteBasePrice}/mo + ${SITE.litePerBooking} per dispatch`;
}

export function founderRateShort(plan: PlanId): string {
  if (plan === "pro") return `${SITE.betaIntroPrice}/mo`;
  if (plan === "scale") return `${SITE.betaScalePrice}/mo`;
  if (plan === "flex") {
    return `${SITE.betaFlexBasePrice}/mo + ${SITE.betaFlexPerBooking}/dispatch`;
  }
  if (plan === "voice_starter") {
    return `${SITE.betaVoiceStarterPrice}/mo + ${SITE.betaVoiceStarterOveragePerMinute}/min over`;
  }
  if (plan === "voice_pro") {
    return `${SITE.betaVoiceProPrice}/mo + ${SITE.betaVoiceProOveragePerMinute}/min over`;
  }
  return `${SITE.betaLiteBasePrice}/mo + ${SITE.betaLitePerBooking}/dispatch`;
}

/** Pro/Scale always use premium COGS × plan multiplier (list copy; no DB). */
export function cappedPlanOverageDisplay(plan: "pro" | "scale", founder = false): string {
  const cogs = SITE.premiumMarginalDispatchCostUsd;
  const mult =
    plan === "pro"
      ? SITE.proOverageMultiplier
      : founder
        ? SITE.betaScaleOverageMultiplier
        : SITE.scaleOverageMultiplier;
  return `$${Math.round(cogs * mult)}`;
}

export function proUsageLine(founder = false): string {
  const over = cappedPlanOverageDisplay("pro", founder);
  return `${SITE.proIncludedDispatches} dispatches/mo included · then ${over} each (predictable — alerts at 80% & 100%)`;
}

export function scaleUsageLine(founder = false): string {
  const over = cappedPlanOverageDisplay("scale", founder);
  return `${SITE.scaleIncludedDispatches} dispatches/mo included · then ${over} each (alerts before any charge)`;
}

export function voiceStarterUsageLine(founder = false): string {
  const over = founder
    ? SITE.betaVoiceStarterOveragePerMinute
    : SITE.voiceStarterOveragePerMinute;
  return `${SITE.voiceStarterIncludedMinutes} min/mo included · then ${over}/min (ceil per call · alerts at 80% & 100%)`;
}

export function voiceProUsageLine(founder = false): string {
  const over = founder ? SITE.betaVoiceProOveragePerMinute : SITE.voiceProOveragePerMinute;
  return `${SITE.voiceProIncludedMinutes} min/mo included · then ${over}/min (ceil per call · alerts before overage)`;
}
