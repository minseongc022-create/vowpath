import { SITE, type PlanId } from "./constants";

/** All plans use the same premium model stack. */
export type AiTier = "economy" | "premium";

export function aiTierForPlan(_plan: PlanId | undefined): AiTier {
  return "premium";
}

export function chatModelForPlan(_plan: PlanId | undefined): string {
  return process.env.OPENAI_MODEL_PREMIUM ?? process.env.OPENAI_MODEL ?? SITE.premiumAiModel;
}

export function jsonModelForPlan(plan: PlanId | undefined): string {
  return chatModelForPlan(plan);
}

export function marginalCogsForPlan(_plan: PlanId | undefined): number {
  return SITE.premiumMarginalDispatchCostUsd;
}

export function aiTierLabelEn(_plan: PlanId | undefined): string {
  return "Premium AI";
}

export function aiTierLabelKo(_plan: PlanId | undefined): string {
  return "프리미엄 AI";
}

export function aiTierLabelEs(_plan: PlanId | undefined): string {
  return "IA Premium";
}
