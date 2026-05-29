import { ROUTES, type PlanId } from "@/lib/constants";

export function checkoutApiHref(plan: PlanId): string {
  return `/api/checkout?plan=${plan}`;
}

export function getStartedHref(plan: PlanId): string {
  return plan === "flex"
    ? `${ROUTES.getStarted}?plan=flex`
    : ROUTES.getStarted;
}
