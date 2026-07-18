import { DEFAULT_PLAN, SITE, type PlanId } from "./constants";

export function isPerDispatchPlan(plan: PlanId | undefined): plan is "flex" | "lite" {
  return plan === "flex" || plan === "lite";
}

export function parsePlanIdFromQuery(value: unknown): PlanId {
  if (value === "unlimited") return "unlimited";
  if (value === "lite") return "lite";
  if (value === "flex") return "flex";
  return DEFAULT_PLAN;
}

export function founderRateLabel(plan: PlanId): string {
  if (plan === "unlimited") return `${SITE.betaIntroPrice}/mo`;
  if (plan === "flex") {
    return `${SITE.betaFlexBasePrice}/mo + ${SITE.betaFlexPerBooking} per dispatch`;
  }
  return `${SITE.betaLiteBasePrice}/mo + ${SITE.betaLitePerBooking} per dispatch`;
}

export function regularRateLabel(plan: PlanId): string {
  if (plan === "unlimited") return `${SITE.monthlyPrice}/mo`;
  if (plan === "flex") {
    return `${SITE.flexBasePrice}/mo + ${SITE.flexPerBooking} per dispatch`;
  }
  return `${SITE.liteBasePrice}/mo + ${SITE.litePerBooking} per dispatch`;
}

export function founderRateShort(plan: PlanId): string {
  if (plan === "unlimited") return `${SITE.betaIntroPrice}/mo`;
  if (plan === "flex") {
    return `${SITE.betaFlexBasePrice}/mo + ${SITE.betaFlexPerBooking}/dispatch`;
  }
  return `${SITE.betaLiteBasePrice}/mo + ${SITE.betaLitePerBooking}/dispatch`;
}
