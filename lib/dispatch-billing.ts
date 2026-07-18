import { SITE, type PlanId } from "./constants";

export type CappedFlatPlanId = "pro" | "scale";

export function isCappedFlatPlan(plan: PlanId | undefined): plan is CappedFlatPlanId {
  return plan === "pro" || plan === "scale";
}

export function includedDispatchesForPlan(plan: CappedFlatPlanId): number {
  return plan === "pro" ? SITE.proIncludedDispatches : SITE.scaleIncludedDispatches;
}

export function overageMultiplierForUser(
  plan: CappedFlatPlanId,
  user: { discountCohort?: string; betaCohortSteppedAt?: string },
): number {
  const founder = user.discountCohort === "beta_feedback" && !user.betaCohortSteppedAt;
  if (plan === "pro") return SITE.proOverageMultiplier;
  return founder ? SITE.betaScaleOverageMultiplier : SITE.scaleOverageMultiplier;
}

export function overageUsdForUser(
  plan: CappedFlatPlanId,
  user: { discountCohort?: string; betaCohortSteppedAt?: string },
): number {
  const mult = overageMultiplierForUser(plan, user);
  return Math.round(SITE.marginalDispatchCostUsd * mult * 100) / 100;
}

export function formatOverageUsd(amount: number): string {
  return `$${Math.round(amount)}`;
}

export function shouldBillDispatchOverage(
  plan: CappedFlatPlanId,
  monthlyCount: number,
): boolean {
  return monthlyCount > includedDispatchesForPlan(plan);
}
