/**
 * 1단계 — 기획(Plan): 시장·경쟁·소비자 니즈 분석
 *
 * Hookable의 "상품입력 → 기획(경쟁·리뷰 분석으로 강조점 결정)" 단계를 재현한다.
 * 여기서는 외부 경쟁사 API를 부르지 않고, 상품 입력값(카테고리·가격·특징)만으로
 * LLM에게 시장 포지셔닝을 추론시킨다. 실제 크롤링 데이터가 있다면 ProductInput에
 * 얹어서 넘기면 되지만, 이 모듈 자체는 "AI 분석" 기능만 재현하는 것이 목표다.
 */

import type { MarketAnalysis, ProductInput } from "./types";
import { requestJson } from "./openai-client";

export const MARKET_ANALYSIS_VERSION = "1.0";

function heuristicAnalysis(input: ProductInput): MarketAnalysis {
  const price = input.priceKrw ?? 0;
  const tone: MarketAnalysis["tone"] =
    price >= 100_000 ? "premium" : price > 0 && price < 15_000 ? "value" : "trust";

  const category = input.category ?? "이 카테고리";
  const consumerNeeds = [
    `${category} 구매 전 품질/실물 확인 니즈`,
    "배송 기간과 반품 가능 여부에 대한 불안",
    "가격 대비 구성/스펙이 합당한지에 대한 의문",
  ];

  const sellingPoints = [
    ...input.features.slice(0, 3),
    price > 0 ? `${price.toLocaleString()}원 — 합리적인 가격대` : "합리적인 가격대",
  ].filter(Boolean);

  return {
    trendSummary: `${category} 카테고리는 스펙 비교 후 구매하는 소비자가 많다.`,
    competitorInsight: "경쟁 상품 대비 핵심 특징을 상단에 배치하면 이탈을 줄일 수 있다.",
    consumerNeeds,
    recommendedSellingPoints: sellingPoints.slice(0, 5),
    tone,
    aiGenerated: false,
  };
}

async function aiAnalysis(input: ProductInput): Promise<MarketAnalysis | null> {
  const prompt = `너는 이커머스 상세페이지 기획자다. 아래 상품에 대해 시장 트렌드, 경쟁 구도,
소비자 니즈를 분석하고 판매 소구점을 도출해라. 없는 사실(구체적 리뷰 수치, 인증 등)은
지어내지 말고 일반적인 시장 통찰 수준으로만 작성해라.

상품명: ${input.name}
카테고리: ${input.category ?? "미상"}
가격: ${input.priceKrw ? `${input.priceKrw.toLocaleString()}원` : "미상"}
특징: ${input.features.join(", ") || "없음"}
설명: ${input.description ?? "없음"}
타깃: ${input.targetAudience ?? "미상"}
키워드: ${input.keyword ?? "없음"}

JSON만 반환:
{
  "trendSummary": "카테고리 트렌드 한 문장",
  "competitorInsight": "경쟁 구도에 대한 통찰 한 문장",
  "consumerNeeds": ["소비자 니즈/불안 2-4개"],
  "recommendedSellingPoints": ["판매 소구점 3-5개, 상품 특징에 기반"],
  "tone": "trust|premium|playful|value 중 하나"
}`;

  const parsed = await requestJson<Partial<MarketAnalysis>>(prompt, { temperature: 0.5 });
  if (!parsed?.recommendedSellingPoints?.length) return null;

  const allowedTones = ["trust", "premium", "playful", "value"] as const;
  const tone = allowedTones.includes(parsed.tone as (typeof allowedTones)[number])
    ? (parsed.tone as MarketAnalysis["tone"])
    : "trust";

  return {
    trendSummary: parsed.trendSummary ?? "",
    competitorInsight: parsed.competitorInsight ?? "",
    consumerNeeds: (parsed.consumerNeeds ?? []).slice(0, 5),
    recommendedSellingPoints: parsed.recommendedSellingPoints.slice(0, 5),
    tone,
    aiGenerated: true,
  };
}

export async function analyzeMarket(input: ProductInput): Promise<MarketAnalysis> {
  const ai = await aiAnalysis(input);
  if (ai) return ai;
  return heuristicAnalysis(input);
}
