import { SITE, type PlanId } from "./constants";
import { normalizePlanId } from "./plan-pricing";

/** Lite/Flex = economy models (protect margin). Pro/Scale = premium models. */
export type AiTier = "economy" | "premium";

export function aiTierForPlan(plan: PlanId | undefined): AiTier {
  const id = normalizePlanId(plan);
  return id === "pro" || id === "scale" ? "premium" : "economy";
}

export function chatModelForPlan(plan: PlanId | undefined): string {
  const tier = aiTierForPlan(plan);
  if (tier === "premium") {
    return process.env.OPENAI_MODEL_PREMIUM ?? process.env.OPENAI_MODEL ?? SITE.premiumAiModel;
  }
  return process.env.OPENAI_MODEL_ECONOMY ?? SITE.economyAiModel;
}

export function jsonModelForPlan(plan: PlanId | undefined): string {
  return chatModelForPlan(plan);
}

export function marginalCogsForPlan(plan: PlanId | undefined): number {
  return aiTierForPlan(plan) === "premium"
    ? SITE.premiumMarginalDispatchCostUsd
    : SITE.economyMarginalDispatchCostUsd;
}

export function aiTierLabelEn(plan: PlanId | undefined): string {
  return aiTierForPlan(plan) === "premium" ? "Premium AI" : "Economy AI";
}

export function aiTierLabelKo(plan: PlanId | undefined): string {
  return aiTierForPlan(plan) === "premium" ? "프리미엄 AI" : "이코노미 AI";
}

export function aiTierLabelEs(plan: PlanId | undefined): string {
  return aiTierForPlan(plan) === "premium" ? "IA Premium" : "IA Economy";
}
