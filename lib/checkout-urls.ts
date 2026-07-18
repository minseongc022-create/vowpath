import { DEFAULT_PLAN, ROUTES, type PlanId } from "@/lib/constants";
import { parsePlanIdFromQuery } from "@/lib/plan-pricing";

export function checkoutApiHref(plan: PlanId): string {
  return `/api/checkout?plan=${plan}`;
}

export function getStartedHref(plan: PlanId = DEFAULT_PLAN): string {
  if (plan === "unlimited") return `${ROUTES.getStarted}?plan=unlimited`;
  if (plan === "lite") return `${ROUTES.getStarted}?plan=lite`;
  return ROUTES.getStarted;
}
