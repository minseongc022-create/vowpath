/**
 * 리뷰 기반 셀링포인트 추출 — Coupilot-style AI 분석
 */

import type { CatalogProduct } from "../types";

export const REVIEW_SELLING_POINTS_VERSION = "1.0";

export type ReviewInsightInput = {
  keyword: string;
  products: Array<{
    name: string;
    reviewCount: number;
    rating?: number;
    priceKrw: number;
    sellerName: string;
  }>;
};

export type ReviewInsightResult = {
  sellingPoints: string[];
  painPoints: string[];
  positiveThemes: string[];
  negativeThemes: string[];
  aiGenerated: boolean;
};

function heuristicInsights(input: ReviewInsightInput): ReviewInsightResult {
  const top = input.products.slice(0, 8);
  const avgReviews =
    top.reduce((s, p) => s + p.reviewCount, 0) / Math.max(top.length, 1);
  const avgPrice =
    top.reduce((s, p) => s + p.priceKrw, 0) / Math.max(top.length, 1);

  const sellingPoints: string[] = [];
  if (avgReviews > 500) {
    sellingPoints.push(`검증된 수요 — 상위 상품 평균 리뷰 ${Math.round(avgReviews).toLocaleString()}건`);
  }
  if (top.some((p) => p.reviewCount > 1000)) {
    sellingPoints.push("베스트셀러급 리뷰 축적 — 신뢰도 높은 카테고리");
  }
  sellingPoints.push(`${input.keyword} 핵심 키워드 — 상위 노출 상품 ${top.length}개 분석`);
  if (avgPrice >= 20000) {
    sellingPoints.push("프리미엄 가격대 — 마진 확보 여지");
  } else {
    sellingPoints.push("합리적 가격대 — 전환율 높은 구간");
  }

  const painPoints = [
    "배송·포장 불만 리뷰 — 빠른 출고·안전 포장 강조",
    "실물 색상·사이즈 차이 — 상세 스펙·실사 강조",
  ];

  return {
    sellingPoints: sellingPoints.slice(0, 5),
    painPoints,
    positiveThemes: ["품질", "가성비", "빠른배송", "재구매"],
    negativeThemes: ["배송지연", "포장", "사이즈"],
    aiGenerated: false,
  };
}

async function openAiInsights(input: ReviewInsightInput): Promise<ReviewInsightResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const productLines = input.products
    .slice(0, 6)
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} — ${p.priceKrw.toLocaleString()}원, 리뷰 ${p.reviewCount}, 판매자 ${p.sellerName}`,
    )
    .join("\n");

  const prompt = `토스쇼핑 키워드 "${input.keyword}" 상위 상품 데이터입니다. Coupilot처럼 리뷰·상품명에서 판매 포인트를 추출하세요.

상품:
${productLines}

JSON만 반환:
{
  "sellingPoints": ["구매 동기 3-5개"],
  "painPoints": ["구매자 불만 2-3개"],
  "positiveThemes": ["긍정 키워드 3-4개"],
  "negativeThemes": ["부정 키워드 2-3개"]
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.JARVIS_OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<ReviewInsightResult>;
    return {
      sellingPoints: (parsed.sellingPoints ?? []).slice(0, 5),
      painPoints: (parsed.painPoints ?? []).slice(0, 4),
      positiveThemes: (parsed.positiveThemes ?? []).slice(0, 5),
      negativeThemes: (parsed.negativeThemes ?? []).slice(0, 4),
      aiGenerated: true,
    };
  } catch {
    return null;
  }
}

export async function extractReviewSellingPoints(
  input: ReviewInsightInput,
): Promise<ReviewInsightResult> {
  const ai = await openAiInsights(input);
  if (ai && ai.sellingPoints.length >= 2) return ai;
  return heuristicInsights(input);
}

export function productsToReviewInput(
  keyword: string,
  products: CatalogProduct[],
): ReviewInsightInput {
  return {
    keyword,
    products: products.slice(0, 10).map((p) => ({
      name: p.name,
      reviewCount: p.reviewCount,
      rating: p.rating,
      priceKrw: p.priceKrw,
      sellerName: p.sellerName,
    })),
  };
}
