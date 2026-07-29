import { openAiJsonCompletion } from "../openai-json";
import type { CompetitorInsight } from "./competitor-research";
import type { ProductAnalysis } from "./product-analysis";

export type DetailCopy = {
  headline: string;
  subheadline: string;
  hookParagraph: string;
  featureBullets: string[];
  specTable: { label: string; value: string }[];
  trustBadges: string[];
  faq: { q: string; a: string }[];
  ctaLine: string;
  seoKeywords: string[];
};

type CopyPayload = DetailCopy;

export async function generateDetailCopy(params: {
  analysis: ProductAnalysis;
  insights: CompetitorInsight;
  skuLabel?: string;
  listingTitle?: string;
}): Promise<DetailCopy> {
  const competitorTitles = params.insights.topProducts
    .slice(0, 3)
    .map((p) => p.title)
    .join("\n- ");

  const payload = await openAiJsonCompletion<CopyPayload>({
    system: `You write professional Korean product detail page copy for Coupang and Naver Smart Store.
Rules:
- Natural Korean only — no awkward machine translation
- No false claims (KC, medical, "국내 1위" unless given)
- No competitor brand names
- Short punchy headlines, scannable bullets
- Match detailStyle: ${params.analysis.detailStyle}`,
    user: `Product: ${params.analysis.productNameKo}
Category: ${params.analysis.category}
SKU/option: ${params.skuLabel ?? "단일"}
Source title: ${params.listingTitle ?? ""}
Target: ${params.analysis.targetAudience}
Features: ${params.analysis.keyFeatures.join(", ")}

Competitor strengths to match or beat:
${params.insights.commonStrengths.join("\n")}

Our recommended appeals:
${params.insights.recommendedAppeals.join("\n")}

Tone: ${params.insights.copyTone}

Top competitor titles (reference only, do not copy):
- ${competitorTitles || "없음"}

Return JSON:
{
  "headline": "메인 헤드라인 1줄",
  "subheadline": "서브 1줄",
  "hookParagraph": "2-3 sentences — why buy now",
  "featureBullets": ["5-7 benefit bullets with ✓ prefix optional"],
  "specTable": [{"label":"소재","value":"..."}, ... 4-6 rows],
  "trustBadges": ["3-4 badges like 빠른배송, 품질검수, A/S 안내 등 — factual only"],
  "faq": [{"q":"...","a":"..."}, ... 3 items],
  "ctaLine": "short closing CTA",
  "seoKeywords": ["5-8 Korean keywords"]
}`,
    temperature: 0.35,
    timeoutMs: 35_000,
  });

  return {
    headline: payload.headline?.trim() || params.analysis.productNameKo,
    subheadline: payload.subheadline?.trim() || "",
    hookParagraph: payload.hookParagraph?.trim() || "",
    featureBullets: payload.featureBullets?.slice(0, 8) ?? [],
    specTable: payload.specTable?.slice(0, 8) ?? [],
    trustBadges: payload.trustBadges?.slice(0, 5) ?? [],
    faq: payload.faq?.slice(0, 4) ?? [],
    ctaLine: payload.ctaLine?.trim() || "지금 바로 만나보세요.",
    seoKeywords: payload.seoKeywords?.slice(0, 10) ?? [],
  };
}
