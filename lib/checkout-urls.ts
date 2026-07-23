import { DEFAULT_PLAN, ROUTES, type PlanId } from "@/lib/constants";
import { normalizePlanId } from "@/lib/plan-pricing";

export function checkoutApiHref(plan: PlanId): string {
  return `/api/checkout?plan=${plan}`;
}

export function getStartedHref(plan: PlanId = DEFAULT_PLAN): string {
  const id = normalizePlanId(plan);
  return `${ROUTES.getStarted}?plan=${id}`;
}

export function signupHref(plan: PlanId = DEFAULT_PLAN): string {
  const id = normalizePlanId(plan);
  return `${ROUTES.signup}?plan=${id}`;
}
