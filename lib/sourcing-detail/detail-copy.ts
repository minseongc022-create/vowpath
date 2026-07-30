import { openAiJsonCompletion } from "../openai-json";
import type { CompetitorInsight } from "./competitor-research";
import type { DesignToolkit } from "./design-toolkit";
import type { ProductAnalysis } from "./product-analysis";

export type DetailCopy = {
  headline: string;
  subheadline: string;
  hookParagraph: string;
  storyParagraph: string;
  featureBullets: string[];
  benefitSections: { title: string; body: string }[];
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
  toolkit: DesignToolkit;
  skuLabel?: string;
  listingTitle?: string;
}): Promise<DetailCopy> {
  const competitorTitles = params.insights.topProducts
    .slice(0, 3)
    .map((p) => p.title)
    .join("\n- ");

  const payload = await openAiJsonCompletion<CopyPayload>({
    system: `You are a senior Korean e-commerce copywriter for Coupang / Smart Store detail pages.
Write like a premium agency brief — professional, refined, never awkward machine Korean.
Design toolkit mood: ${params.toolkit.label} — ${params.toolkit.moodNote}
detailStyle: ${params.analysis.detailStyle}

Hard rules:
- Native Korean only
- No false claims (KC, medical, 국내 1위) unless provided
- No competitor brand names
- Sound expensive and trustworthy, not spammy
- Specific to THIS product category and features`,
    user: `Product: ${params.analysis.productNameKo}
Category: ${params.analysis.category}
SKU: ${params.skuLabel ?? "단일"}
Source title: ${params.listingTitle ?? ""}
Audience: ${params.analysis.targetAudience}
Features: ${params.analysis.keyFeatures.join(", ")}
Selling points: ${params.analysis.sellingPoints.join(", ")}

Competitor strengths:
${params.insights.commonStrengths.join("\n")}

Our appeals:
${params.insights.recommendedAppeals.join("\n")}

Tone guide: ${params.insights.copyTone}

Competitor titles (do not copy):
- ${competitorTitles || "없음"}

Return JSON:
{
  "headline": "고급스러운 메인 헤드라인",
  "subheadline": "세련된 서브카피",
  "hookParagraph": "오프닝 2~3문장 — 왜 이 상품인지",
  "storyParagraph": "브랜드/사용 스토리 톤 2~3문장 (과장 없이)",
  "featureBullets": ["6~8개 혜택 불릿 — 구체적"],
  "benefitSections": [{"title":"섹션 제목","body":"2문장"}, ... 3 items],
  "specTable": [{"label":"...","value":"..."}, ... 5~7],
  "trustBadges": ["사실만 — 검수/배송/포장 등 3~4"],
  "faq": [{"q":"...","a":"..."}, ... 3~4],
  "ctaLine": "클로징 CTA",
  "seoKeywords": ["5~10 한국어 키워드"]
}`,
    temperature: 0.4,
    timeoutMs: 40_000,
  });

  return {
    headline: payload.headline?.trim() || params.analysis.productNameKo,
    subheadline: payload.subheadline?.trim() || "",
    hookParagraph: payload.hookParagraph?.trim() || "",
    storyParagraph: payload.storyParagraph?.trim() || "",
    featureBullets: payload.featureBullets?.slice(0, 8) ?? [],
    benefitSections: payload.benefitSections?.slice(0, 4) ?? [],
    specTable: payload.specTable?.slice(0, 8) ?? [],
    trustBadges: payload.trustBadges?.slice(0, 5) ?? [],
    faq: payload.faq?.slice(0, 4) ?? [],
    ctaLine: payload.ctaLine?.trim() || "지금 바로 확인해보세요.",
    seoKeywords: payload.seoKeywords?.slice(0, 10) ?? [],
  };
}
