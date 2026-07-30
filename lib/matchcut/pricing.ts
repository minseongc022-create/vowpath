import { openAiJsonCompletion } from "../openai-json";
import {
  calcPricing,
  MARKET_FEE_PROFILES,
  type PricingRecommendation,
} from "./pricing-calc";

export {
  calcPricing,
  MARKET_FEE_PROFILES,
  type CostInputs,
  type MarketFeeProfile,
  type PricingRecommendation,
} from "./pricing-calc";

export async function enrichPricingRationale(
  pricing: PricingRecommendation,
  productName?: string,
): Promise<string> {
  try {
    const out = await openAiJsonCompletion<{ rationale: string }>({
      system: "You write short Korean pricing notes for import sellers. JSON only.",
      user: `Product: ${productName ?? "상품"}
Market: ${pricing.marketLabel}
Cost: ${pricing.totalCostKrw}
Recommended: ${pricing.recommendedPriceKrw}
Competitor median: ${pricing.competitorMedian ?? "n/a"}
Net: ${pricing.estimatedNetKrw}
Return {"rationale":"2 short Korean sentences for sellers"}`,
      temperature: 0.3,
      timeoutMs: 12_000,
    });
    return out.rationale?.trim() || pricing.rationale;
  } catch {
    return pricing.rationale;
  }
}
