/**
 * 3단계 — 생성(Generate): 섹션별 AI 카피라이팅
 *
 * planSections가 정한 섹션 각각에 대해 헤딩/본문을 채운다. spec은 표,
 * faq는 Q&A 형태로 채운다. AI 실패 시 market-analysis 결과만으로 만든
 * 휴리스틱 카피로 폴백한다 — 어떤 경우든 9개 섹션이 전부 채워진다.
 */

import type { CopyDraft, MarketAnalysis, ProductInput, SectionCopy, SectionPlan } from "./types";
import { requestJson } from "./openai-client";

export const COPYWRITER_VERSION = "1.0";

function heuristicCopy(input: ProductInput, analysis: MarketAnalysis, plan: SectionPlan): CopyDraft {
  const price = input.priceKrw ? `${input.priceKrw.toLocaleString()}원` : "가격 문의";
  const points = analysis.recommendedSellingPoints.length
    ? analysis.recommendedSellingPoints
    : input.features;

  const bySectionKind: Record<string, SectionCopy> = {
    hook: {
      kind: "hook",
      heading: input.name,
      body: [`${input.category ?? ""} ${price}`.trim()],
    },
    problem: {
      kind: "problem",
      heading: "이런 점, 불편하지 않으셨나요?",
      body: analysis.consumerNeeds.slice(0, 3),
    },
    solution: {
      kind: "solution",
      heading: `${input.name}가 해결합니다`,
      body: [analysis.trendSummary, analysis.competitorInsight].filter(Boolean),
    },
    features: {
      kind: "features",
      heading: "핵심 특징",
      body: points.slice(0, 5),
    },
    proof: {
      kind: "proof",
      heading: "믿을 수 있는 이유",
      body: ["꼼꼼한 품질 확인을 거쳐 판매합니다.", "문의에 빠르게 응답합니다."],
    },
    spec: {
      kind: "spec",
      heading: "상품 정보",
      body: [],
      rows: [
        { label: "상품명", value: input.name },
        { label: "카테고리", value: input.category ?? "-" },
        { label: "가격", value: price },
        ...input.features.slice(0, 4).map((f, i) => ({ label: `특징 ${i + 1}`, value: f })),
      ],
    },
    guarantee: {
      kind: "guarantee",
      heading: "배송 · 교환 · 반품",
      body: ["결제 확인 후 순차 발송됩니다.", "수령 후 7일 이내 교환/반품 신청이 가능합니다."],
    },
    faq: {
      kind: "faq",
      heading: "자주 묻는 질문",
      body: [],
      qa: [
        { q: "배송은 얼마나 걸리나요?", a: "결제 확인 후 순차적으로 발송됩니다." },
        { q: "교환/반품이 가능한가요?", a: "수령 후 7일 이내 신청 가능합니다." },
      ],
    },
    cta: {
      kind: "cta",
      heading: "지금 만나보세요",
      body: [`${input.name}, ${price}`],
    },
  };

  return {
    sections: plan.sections.map((s) => bySectionKind[s.kind]),
    aiGenerated: false,
  };
}

async function aiCopy(input: ProductInput, analysis: MarketAnalysis, plan: SectionPlan): Promise<CopyDraft | null> {
  const sectionList = plan.sections.map((s) => s.kind).join(", ");

  const prompt = `너는 이커머스 상세페이지 카피라이터다. 아래 상품과 시장 분석을 바탕으로
섹션(${sectionList})마다 헤딩과 본문을 작성해라. 톤은 "${analysis.tone}". 없는 사실(구체적
리뷰 수치, 인증, 배송 약속 등)은 지어내지 마라.

상품명: ${input.name}
카테고리: ${input.category ?? "미상"}
가격: ${input.priceKrw ? `${input.priceKrw.toLocaleString()}원` : "미상"}
특징: ${input.features.join(", ") || "없음"}
시장 분석 - 트렌드: ${analysis.trendSummary}
시장 분석 - 경쟁 인사이트: ${analysis.competitorInsight}
소비자 니즈: ${analysis.consumerNeeds.join(" / ")}
판매 소구점: ${analysis.recommendedSellingPoints.join(" / ")}

JSON만 반환. sections는 위 섹션 목록과 같은 순서·같은 kind로 정확히 9개:
{
  "sections": [
    { "kind": "hook", "heading": "...", "body": ["..."] },
    { "kind": "problem", "heading": "...", "body": ["...", "..."] },
    { "kind": "solution", "heading": "...", "body": ["..."] },
    { "kind": "features", "heading": "...", "body": ["특징 3-5개, 문장형"] },
    { "kind": "proof", "heading": "...", "body": ["일반적인 신뢰 신호 문장 1-3개 (지어낸 수치 금지)"] },
    { "kind": "spec", "heading": "...", "rows": [{"label":"...", "value":"..."}] },
    { "kind": "guarantee", "heading": "...", "body": ["배송/교환/반품 일반 안내 1-3개"] },
    { "kind": "faq", "heading": "...", "qa": [{"q":"...", "a":"..."}] },
    { "kind": "cta", "heading": "...", "body": ["..."] }
  ]
}`;

  const parsed = await requestJson<{ sections?: Partial<SectionCopy>[] }>(prompt, { temperature: 0.6 });
  if (!parsed?.sections?.length) return null;

  const byKind = new Map(parsed.sections.map((s) => [s.kind, s]));
  const sections: SectionCopy[] = [];
  for (const planned of plan.sections) {
    const s = byKind.get(planned.kind);
    if (!s?.heading) return null; // 하나라도 비면 전체를 휴리스틱으로 폴백 (일관성 유지)
    sections.push({
      kind: planned.kind,
      heading: s.heading,
      body: (s.body ?? []).slice(0, 6),
      rows: s.rows?.slice(0, 8),
      qa: s.qa?.slice(0, 6),
    });
  }

  return { sections, aiGenerated: true };
}

export async function writeCopy(input: ProductInput, analysis: MarketAnalysis, plan: SectionPlan): Promise<CopyDraft> {
  const ai = await aiCopy(input, analysis, plan);
  if (ai) return ai;
  return heuristicCopy(input, analysis, plan);
}
