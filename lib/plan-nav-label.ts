import type { PlanId } from "./constants";
import { normalizePlanId } from "./plan-pricing";

/** Scale is the top tier — show "View plan" instead of upgrade CTA. */
export function isTopTierPlan(plan: PlanId | null | undefined): boolean {
  return normalizePlanId(plan ?? undefined) === "scale";
}

export function planNavTitleEn(plan: PlanId | null | undefined): string {
  return isTopTierPlan(plan) ? "Your plan" : "Upgrade plan";
}

export function planNavTitleKo(plan: PlanId | null | undefined): string {
  return isTopTierPlan(plan) ? "내 플랜" : "플랜 업그레이드";
}

export function planNavCtaEn(plan: PlanId | null | undefined): string {
  return isTopTierPlan(plan) ? "View plan" : "Upgrade plan";
}

export function planNavCtaKo(plan: PlanId | null | undefined): string {
  return isTopTierPlan(plan) ? "플랜 보기" : "플랜 업그레이드";
}
