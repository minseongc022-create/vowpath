import { DEFAULT_PLAN, SITE, type PlanId } from "./constants";

/**
 * Client-safe plan display helpers only.
 * Do not import server modules (users-db / dispatch-billing) here —
 * marketing content pulls this into the browser bundle.
 */

export function normalizePlanId(raw: unknown): PlanId {
  if (raw === "lite" || raw === "flex" || raw === "pro" || raw === "scale") return raw;
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

export function founderRateLabel(plan: PlanId): string {
  if (plan === "pro") return `${SITE.betaIntroPrice}/mo`;
  if (plan === "scale") return `${SITE.betaScalePrice}/mo`;
  if (plan === "flex") {
    return `${SITE.betaFlexBasePrice}/mo + ${SITE.betaFlexPerBooking} per dispatch`;
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
  return `${SITE.liteBasePrice}/mo + ${SITE.litePerBooking} per dispatch`;
}

export function founderRateShort(plan: PlanId): string {
  if (plan === "pro") return `${SITE.betaIntroPrice}/mo`;
  if (plan === "scale") return `${SITE.betaScalePrice}/mo`;
  if (plan === "flex") {
    return `${SITE.betaFlexBasePrice}/mo + ${SITE.betaFlexPerBooking}/dispatch`;
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
