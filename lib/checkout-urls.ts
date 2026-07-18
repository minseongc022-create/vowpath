import { DEFAULT_PLAN, ROUTES, type PlanId } from "@/lib/constants";
import { normalizePlanId } from "@/lib/plan-pricing";

export function checkoutApiHref(plan: PlanId): string {
  return `/api/checkout?plan=${plan}`;
}

export function getStartedHref(plan: PlanId = DEFAULT_PLAN): string {
  if (plan === "pro") return `${ROUTES.getStarted}?plan=pro`;
  if (plan === "scale") return `${ROUTES.getStarted}?plan=scale`;
  if (plan === "lite") return `${ROUTES.getStarted}?plan=lite`;
  return ROUTES.getStarted;
}
