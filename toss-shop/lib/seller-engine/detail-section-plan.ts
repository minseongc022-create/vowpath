/**
 * 상세페이지 섹션 구성 — 후커블·드랩이 쓰는 구조를 사실 기반으로 재현한다
 *
 * ★ 무엇을 가져왔고 무엇을 안 가져왔는가 (정직하게)
 *
 * 가져온 것 — **공개된 구조와 방법론**:
 *  · 후커블 워크플로: 상품입력 → 기획(경쟁·리뷰 분석으로 강조점·섹션순서 결정)
 *    → 생성 → 수정 → 내보내기
 *  · 드랩 카피 구조: 문제 제기 → 솔루션 제시 → 사회적 증거 → 구매 유도(CTA)
 *    (마케팅에서 PASONA/PAS라 부르는 고전 설득 구조다. 특정 회사의 발명이
 *     아니라 업계 공용 프레임이므로 그대로 구현해도 문제가 없다)
 *  · 한국 오픈마켓 관행: 하나의 긴 세로 흐름에 문제제기·사용장면·기능·리뷰를
 *    순서대로 배치
 *
 * 안 가져온 것 — **가져올 수 없는 것**:
 *  · 그들이 460만 건 커머스 데이터로 학습시킨 모델 가중치
 *  · 그들의 디자인 에셋·폰트·일러스트
 *  이건 API도 없고 복제 대상도 아니다. 우리는 같은 **구조**를 우리 데이터로 채운다.
 *
 * ★ 이 파일이 하는 일과 안 하는 일
 *
 * 하는 일: "어떤 섹션을, 어떤 순서로, 무슨 내용으로 채울지"를 정한다.
 * 안 하는 일: HTML 렌더링(premium-detail-template), 문장 다듬기(copy-polish),
 *            사진 생성(product-shot-set). 각자 자기 일만 한다.
 *
 * ★ 왜 "9개 섹션 고정"이 아니라 "채울 수 있는 섹션만"인가
 *
 * 드랩은 4개 입력(상품명·특징·타겟·컬러톤)만 받아 9개 섹션을 **항상** 만든다.
 * 그게 가능한 이유는 없는 내용을 AI가 지어내기 때문이다 — "고객 리뷰" 섹션에
 * 실제 리뷰가 없으면 그럴듯한 리뷰 문장을 생성한다.
 *
 * 우리는 그렇게 할 수 없다. 위탁판매는 실물을 검증할 수 없고, 없는 리뷰를
 * 지어내는 건 전자상거래법상 기만적 표시다(추천·보증 심사지침 위반).
 * 그래서 **근거가 있는 섹션만 만들고, 없으면 그 섹션을 통째로 뺀다.**
 * 섹션 수가 적은 페이지가, 지어낸 리뷰가 박힌 페이지보다 항상 낫다.
 */

import type { TossShopCategory } from "../types";
import { sanitizeCopy } from "./buyer-psychology";
import type { Objection } from "./buyer-psychology";

export const SECTION_PLAN_VERSION = "1.0";

/**
 * 섹션 종류 — 한국 오픈마켓 상세페이지의 표준 흐름 순서대로.
 *
 * 순서 자체가 설득 구조다. 바꾸면 논리가 무너진다:
 * 눈길(hook) → 공감(problem) → 해결(solution) → 근거(features) →
 * 신뢰(proof) → 확인(spec) → 안심(guarantee) → 마무리(cta)
 */
export type SectionKind =
  /** 히어로 — 첫 화면. 상품이 뭔지 3초 안에 */
  | "hook"
  /** 문제 제기 — 사는 사람이 지금 겪고 있는 불편 */
  | "problem"
  /** 솔루션 — 이 상품이 그 불편을 어떻게 푸는지 */
  | "solution"
  /** 핵심 기능·특징 — 사진과 짝지어 하나씩 */
  | "features"
  /** 사회적 증거 — 실제로 확인된 것만 (없으면 섹션 자체를 뺀다) */
  | "proof"
  /** 상품 정보 — 규격·구성 표 */
  | "spec"
  /** 배송·교환·반품 — 사기 직전 마지막 걱정 */
  | "guarantee"
  /** 자주 묻는 질문 — 결제 직전 남은 의문 */
  | "faq";

export type PlannedSection = {
  kind: SectionKind;
  /** 섹션 제목 — 카테고리 톤에 맞춰진다 */
  heading: string;
  /** 본문 문단들 — 전부 사실 기반 */
  body: string[];
  /** 이 섹션에 붙일 이미지 (없으면 텍스트만) */
  imageUrls?: string[];
  /** 표 형태 데이터 (spec 섹션) */
  rows?: Array<{ label: string; value: string }>;
  /** 질문·답변 쌍 (faq 섹션) */
  qa?: Objection[];
};

export type SectionPlan = {
  engineVersion: string;
  sections: PlannedSection[];
  /** 근거가 없어 뺀 섹션과 이유 — 무엇이 왜 빠졌는지 남긴다 */
  omitted: Array<{ kind: SectionKind; reason: string }>;
};

/**
 * 카테고리별 문제 제기 문구.
 *
 * ⚠️ 이건 "상품이 해결하는 일반적 불편"이지 상품 고유의 주장이 아니다.
 * 예: 청소기 카테고리에 "구석 먼지가 잘 안 닿는다"는 누구나 아는 사실이고,
 * 이 상품이 그걸 해결한다고 **단정하지 않는다** — 해결한다고 쓰려면 성능
 * 근거가 있어야 하는데 위탁은 그걸 검증할 수 없다. 그래서 문제만 제기하고,
 * 솔루션 섹션은 확인된 사실(구성·규격·배송)로만 채운다.
 */
const CATEGORY_PROBLEMS: Record<TossShopCategory, string> = {
  food: "매번 장 보러 나가기 번거롭고, 좋은 걸 고르기도 쉽지 않습니다.",
  beauty: "제품은 많은데 내 피부에 맞는 걸 고르기가 어렵습니다.",
  home: "집안일에 드는 시간과 손이 생각보다 많이 갑니다.",
  digital: "쓰던 기기와 호환되는지, 오래 쓸 수 있는지 확인이 어렵습니다.",
  fashion: "사이즈와 색이 사진과 다를까 봐 선뜻 담기 어렵습니다.",
  health: "챙겨야 하는 건 아는데 뭘 얼마나 먹어야 할지 헷갈립니다.",
};

const CATEGORY_HEADINGS: Record<
  TossShopCategory,
  { solution: string; features: string; proof: string }
> = {
  food: { solution: "이렇게 준비했습니다", features: "이런 점을 확인하세요", proof: "믿고 사셔도 되는 이유" },
  beauty: { solution: "이런 분께 맞습니다", features: "제품 특징", proof: "믿고 사셔도 되는 이유" },
  home: { solution: "생활이 이렇게 달라집니다", features: "제품 특징", proof: "믿고 사셔도 되는 이유" },
  digital: { solution: "이렇게 해결됩니다", features: "핵심 사양", proof: "믿고 사셔도 되는 이유" },
  fashion: { solution: "이렇게 입으세요", features: "스타일 포인트", proof: "믿고 사셔도 되는 이유" },
  health: { solution: "이렇게 챙기세요", features: "제품 특징", proof: "믿고 사셔도 되는 이유" },
};

export type SectionPlanInput = {
  title: string;
  category?: TossShopCategory;
  /** 사실로 확인된 셀링포인트 (buyer-psychology → copy-polish를 거친 것) */
  sellingPoints: string[];
  /** 실제 상품 사진 */
  imageUrls: string[];
  /** 상품 설명 원문 */
  description?: string;
  /** 규격·구성 — 확인된 것만 */
  specs?: Array<{ label: string; value: string }>;
  /** 구매 저항 해소 Q&A */
  objections?: Objection[];
  /** 배송 안내 (사실) */
  deliveryNote?: string;
  /** 반품 안내 (사실) */
  returnNote?: string;
  /**
   * 사회적 증거로 쓸 수 있는 **실측값**.
   *
   * ⚠️ 리뷰 문장을 지어내지 않는다. 우리가 가진 건 경쟁 상품의 리뷰 수 같은
   * 시장 통계뿐이고, 그건 "이 상품이 좋다"는 증거가 아니다. 그래서 우리
   * 스토어의 실제 판매 실적이 쌓이기 전까지 proof 섹션은 대부분 빠진다.
   */
  proof?: {
    /** 우리 스토어에서 실제로 팔린 수량 (정산 데이터 기준) */
    soldCount?: number;
    /** 공급처가 검증된 1등급·당일발송인가 */
    verifiedFastShipping?: boolean;
  };
};

/** 문구를 정리하고 비었으면 버린다 */
function cleanLines(lines: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    if (!raw?.trim()) continue;
    const { clean } = sanitizeCopy(raw);
    if (clean.trim()) out.push(clean.trim());
  }
  return out;
}

/**
 * 상세페이지 섹션 구성을 정한다.
 *
 * 각 섹션은 **채울 근거가 있을 때만** 만들어진다. 근거가 없으면 omitted에
 * 이유를 남기고 건너뛴다 — 지어내서 채우지 않는다.
 */
export function planDetailSections(input: SectionPlanInput): SectionPlan {
  const sections: PlannedSection[] = [];
  const omitted: SectionPlan["omitted"] = [];
  const category = input.category ?? "home";
  const headings = CATEGORY_HEADINGS[category] ?? CATEGORY_HEADINGS.home;
  const images = input.imageUrls.filter(Boolean);
  const points = cleanLines(input.sellingPoints);

  // ── 1. HOOK — 대표 사진 + 상품명 ────────────────────────
  sections.push({
    kind: "hook",
    heading: input.title,
    body: [],
    imageUrls: images.slice(0, 1),
  });

  // ── 2. PROBLEM — 카테고리 공통의 불편 ───────────────────
  // 상품 고유 주장이 아니라 누구나 아는 상황이라 근거 없이 써도 안전하다.
  const problem = CATEGORY_PROBLEMS[category];
  if (problem) {
    sections.push({ kind: "problem", heading: "이런 고민 있으셨나요", body: [problem] });
  }

  // ── 3. SOLUTION — 확인된 사실로만 ───────────────────────
  // 셀링포인트 앞 2개가 "가장 강한 사실"이다(buyer-psychology가 구매 결정
  // 순서로 정렬해 둔다). 그걸 솔루션으로 쓴다.
  const solutionBody = points.slice(0, 2);
  if (solutionBody.length) {
    sections.push({ kind: "solution", heading: headings.solution, body: solutionBody });
  } else {
    omitted.push({ kind: "solution", reason: "확인된 셀링포인트가 없어 솔루션을 단정할 수 없음" });
  }

  // ── 4. FEATURES — 사진 하나에 문구 하나 ─────────────────
  // 한국 상세페이지의 핵심 구간이다. 남은 셀링포인트와 남은 사진을 짝짓는다.
  const restPoints = points.slice(solutionBody.length);
  const restImages = images.slice(1);
  if (restPoints.length || restImages.length) {
    sections.push({
      kind: "features",
      heading: headings.features,
      body: restPoints,
      imageUrls: restImages,
    });
  }

  // ── 5. PROOF — 실측 근거가 있을 때만 ────────────────────
  //
  // ⚠️ 드랩은 이 자리에 "고객 리뷰"를 생성해서 넣는다. 우리는 안 한다.
  // 없는 리뷰를 만들면 기만적 표시다. 우리가 정직하게 쓸 수 있는 건
  // (a) 우리 스토어의 실제 판매 수량, (b) 검증된 공급처의 출고 속도뿐이다.
  const proofLines = cleanLines([
    input.proof?.soldCount && input.proof.soldCount >= 10
      ? `지금까지 ${input.proof.soldCount.toLocaleString()}개 판매되었습니다.`
      : undefined,
    input.proof?.verifiedFastShipping
      ? "당일 출고가 확인된 공급처에서 발송됩니다."
      : undefined,
  ]);
  if (proofLines.length) {
    sections.push({ kind: "proof", heading: headings.proof, body: proofLines });
  } else {
    omitted.push({
      kind: "proof",
      reason:
        "실제 판매 실적·검증된 배송 근거가 아직 없음 — 리뷰를 지어내지 않고 섹션을 뺀다",
    });
  }

  // ── 6. SPEC — 확인된 규격만 ─────────────────────────────
  const specs = (input.specs ?? []).filter((s) => s.label?.trim() && s.value?.trim());
  if (specs.length) {
    sections.push({ kind: "spec", heading: "상품 정보", body: [], rows: specs });
  } else {
    omitted.push({ kind: "spec", reason: "공급처에서 판독된 규격 정보가 없음" });
  }

  // ── 7. GUARANTEE — 배송·교환·반품 ───────────────────────
  const guaranteeBody = cleanLines([
    input.deliveryNote,
    input.returnNote,
    "상품 수령 후 7일 이내 교환·반품 신청이 가능합니다.",
  ]);
  sections.push({ kind: "guarantee", heading: "배송 · 교환 · 반품", body: guaranteeBody });

  // ── 8. FAQ — 결제 직전 남은 의문 ────────────────────────
  const qa = (input.objections ?? []).filter((o) => o.concern?.trim() && o.answer?.trim());
  if (qa.length) {
    sections.push({ kind: "faq", heading: "자주 묻는 질문", body: [], qa });
  } else {
    omitted.push({ kind: "faq", reason: "확인된 정책에서 도출된 Q&A가 없음" });
  }

  return { engineVersion: SECTION_PLAN_VERSION, sections, omitted };
}
