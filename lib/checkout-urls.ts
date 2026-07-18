import { DEFAULT_PLAN, ROUTES, type PlanId } from "@/lib/constants";

export function checkoutApiHref(plan: PlanId): string {
  return `/api/checkout?plan=${plan}`;
}

export function getStartedHref(plan: PlanId = DEFAULT_PLAN): string {
  return plan === "unlimited"
    ? `${ROUTES.getStarted}?plan=unlimited`
    : ROUTES.getStarted;
}
