/**
 * 2단계 — 기획(Plan): 섹션 구성·순서 결정
 *
 * Hookable은 입력 4가지(상품명·특징·타깃·톤)만으로 9개 섹션을 항상 채운다.
 * 이 모듈은 그 동작을 "기능적으로 동일하게" 재현한다 — 항상 고정된 설득
 * 구조(hook → problem → solution → features → proof → spec → guarantee →
 * faq → cta)로 9개 섹션을 만든다. (참고: toss-shop 쪽 detail-section-plan.ts는
 * 위탁판매 법적 제약 때문에 근거 없는 섹션을 빼도록 설계돼 있는데, 그건 이
 * 모듈과는 다른 파일이고 이 모듈은 그 파일을 참조하지 않는다.)
 */

import type { MarketAnalysis, PlannedSection, ProductInput, SectionPlan } from "./types";
import { SECTION_KINDS } from "./types";

export const SECTION_PLANNER_VERSION = "1.0";

const RATIONALE: Record<(typeof SECTION_KINDS)[number], string> = {
  hook: "첫 화면에서 3초 안에 상품이 무엇인지 각인시킨다.",
  problem: "구매자가 지금 겪는 불편을 짚어 공감을 만든다.",
  solution: "이 상품이 그 불편을 어떻게 해결하는지 제시한다.",
  features: "핵심 특징을 사진과 짝지어 하나씩 근거로 제시한다.",
  proof: "신뢰를 뒷받침하는 요소(품질 관리, 톤에 맞는 신뢰 신호)를 배치한다.",
  spec: "구매 직전 확인하는 규격·구성 정보를 표로 정리한다.",
  guarantee: "배송·교환·반품 등 마지막 불안 요소를 해소한다.",
  faq: "결제 직전 남은 의문을 선제적으로 답한다.",
  cta: "지금 구매해야 하는 이유로 마무리한다.",
};

export function planSections(_input: ProductInput, _analysis: MarketAnalysis): SectionPlan {
  const sections: PlannedSection[] = SECTION_KINDS.map((kind, i) => ({
    kind,
    order: i,
    rationale: RATIONALE[kind],
  }));

  return { sections, aiGenerated: false };
}
