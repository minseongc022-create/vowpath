/**
 * 구매심리 엔진 — 사실만으로 설득하고, 촌스러움은 규칙으로 막는다
 *
 * ★ 무엇이 실제로 구매를 만드는가
 *
 * 상세페이지에서 결제로 넘어가는 순간을 만드는 건 감탄사가 아니라 **불안의 해소**다.
 * 사는 사람은 "이거 좋아 보인다"에서 멈추지 않고 "실패하면 어쩌지"를 넘어야 산다.
 * 그래서 이 엔진은 자랑을 나열하지 않고 다음 순서를 만든다.
 *
 *  1. 구체적 사실 — "빠른 배송"이 아니라 "오늘 출발". 형용사는 안 믿지만 사실은 믿는다.
 *  2. 저항 해소   — 반품·품질·사이즈 불안을 **묻기 전에** 답한다.
 *  3. 비교 기준   — 경쟁 상품 대비 실제로 다른 점. 기준이 없으면 최저가만 이긴다.
 *  4. 사용 맥락   — 언제 어떻게 쓰는지가 그려져야 "나한테 필요한가"가 풀린다.
 *
 * ★ 왜 금지 문구를 코드로 막는가
 *
 * "대박", "초특가", "미친 가격", 느낌표 도배 — 이런 게 상세페이지를 촌스럽게 만들고,
 * 동시에 토스 정책상 실증 없는 최상급·과장 표현은 제재 대상이다. 프롬프트로
 * "쓰지 마"라고 부탁하는 것과 출력에서 걸러내는 것은 신뢰도가 다르다.
 * 위탁판매는 실물을 검증할 수 없어 과장이 곧 허위표시가 되므로 규칙으로 막는다.
 *
 * ★ 가짜 긴박감을 만들지 않는다
 *
 * "마감 임박", "품절 직전"은 재고를 실제로 모르면서 쓰면 거짓말이다. 위탁판매는
 * 공급처 재고를 실시간으로 모른다. 그래서 이 엔진은 시간·수량 압박을 만들지 않고,
 * 검증 가능한 조건(가격 차이·배송일)만 근거로 쓴다.
 */

import type { TossShopCategory } from "../types";

export const BUYER_PSYCHOLOGY_VERSION = "1.0";

// ─────────────────────────────────────────────────────────────
// 촌스러움·과장 차단
// ─────────────────────────────────────────────────────────────

/**
 * 쓰면 안 되는 표현.
 *
 * 두 부류다 — (a) 실증 없는 최상급·배타성(정책 위반 소지),
 * (b) 저가 광고 톤(신뢰를 깎는다). 둘 다 걸러낸다.
 */
const BANNED_PHRASES: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /대박|초대박/, why: "저가 광고 톤 — 신뢰도를 떨어뜨림" },
  { pattern: /초특가|폭탄\s*세일|미친\s*(가격|할인)/, why: "저가 광고 톤" },
  { pattern: /업계\s*(1위|최고)|국내\s*(1위|최초)|세계\s*최초/, why: "실증 없는 최상급·배타성 표현" },
  { pattern: /최고급|최상급|최고의/, why: "실증 없는 최상급 표현" },
  { pattern: /100\s*%\s*(만족|보장|정품)/, why: "입증 불가한 절대 보장" },
  { pattern: /마감\s*임박|품절\s*(임박|직전)|서두르세요|지금\s*안\s*사면/, why: "재고를 모르는 상태의 가짜 긴박감" },
  { pattern: /완치|치료|의학적\s*효능/, why: "의학적 효능 표방 — 광고 심의 대상" },
];

/** 느낌표는 문장당 1개까지 — 도배되면 즉시 싸구려로 읽힌다 */
function tameExclamations(text: string): string {
  return text.replace(/!{2,}/g, "!");
}

export type CopyCheck = { clean: string; removed: string[] };

/**
 * 문구에서 금지 표현을 걸러낸다.
 *
 * 잘라내기만 하고 대체하지 않는다 — 무엇이 왜 빠졌는지 `removed`에 남겨
 * 사람이 확인할 수 있게 한다. 조용히 바꿔치기하면 왜 문구가 달라졌는지 모른다.
 */
export function sanitizeCopy(text: string): CopyCheck {
  const removed: string[] = [];
  let out = text;
  for (const { pattern, why } of BANNED_PHRASES) {
    const m = out.match(pattern);
    if (m) {
      removed.push(`"${m[0]}" — ${why}`);
      out = out.replace(new RegExp(pattern.source, "g"), "").replace(/\s{2,}/g, " ");
    }
  }
  return { clean: tameExclamations(out).trim(), removed };
}

/** 이 문구를 그대로 써도 되는가 */
export function isCopyClean(text: string): boolean {
  return !BANNED_PHRASES.some(({ pattern }) => pattern.test(text));
}

// ─────────────────────────────────────────────────────────────
// 설득 설계
// ─────────────────────────────────────────────────────────────

/** 상품에서 확인된 사실만 담는다 — 확인 안 된 건 넣지 않는다 */
export type ProductFacts = {
  /** 공급처가 당일 출고하는가 (실측된 경우만 true) */
  sameDayShipping?: boolean;
  /** 배송비 무료 여부 */
  freeShipping?: boolean;
  /** 판매가 */
  priceKrw: number;
  /** 이 상품 카테고리 */
  category?: TossShopCategory;
  /** 경쟁 상품 최저가 — 있으면 가격 비교 근거로 쓴다 */
  competitorLowKrw?: number;
  /** 경쟁 상품 평균가 */
  competitorAvgKrw?: number;
  /** 상위 경쟁자 평균 리뷰 수 — 리뷰가 적은 시장이면 그 자체가 기회 문구가 된다 */
  competitorAvgReviews?: number;
  /** 반품 안내 — 반품 물류 두뇌가 확정한 사실 */
  returnNote?: string;
  /** 상품 상세에서 뽑아낸 구성·규격 등 사실 문구 */
  specHighlights?: string[];
};

export type Objection = { concern: string; answer: string };

export type PersuasionPlan = {
  engineVersion: string;
  /** 상세 상단 셀링포인트 — 구체적 사실이 먼저 온다 */
  sellingPoints: string[];
  /** 사기 전 떠오르는 불안과 그 답 */
  objections: Objection[];
  /** 경쟁 상품 대비 실제로 다른 점 */
  differentiators: string[];
  /** 넣으려다 뺀 문구와 이유 */
  rejected: string[];
};

/** 카테고리마다 사는 사람이 실제로 걱정하는 지점이 다르다 */
const CATEGORY_CONCERNS: Record<TossShopCategory, string[]> = {
  food: ["유통기한이 얼마나 남았을까", "포장이 상해서 오지 않을까"],
  beauty: ["내 피부에 맞을까", "정품이 맞을까"],
  home: ["우리 집 크기에 맞을까", "생각보다 조잡하지 않을까"],
  digital: ["내 기기와 호환될까", "고장 나면 어떻게 하나"],
  fashion: ["사이즈가 맞을까", "사진과 색이 다르지 않을까"],
  health: ["나에게 맞는 용량일까", "부작용은 없을까"],
};

/**
 * 사는 사람이 답을 아는 질문만 답한다.
 *
 * 위탁판매는 실물을 못 봤다. 그래서 "품질 최고"처럼 검증 못 하는 답 대신,
 * **반품이 되는지**로 답한다. 실패해도 되돌릴 수 있다는 게 실물을 못 보는
 * 구매에서 가장 강한 안심 장치이고, 유일하게 우리가 보장할 수 있는 사실이다.
 */
function buildObjections(facts: ProductFacts): Objection[] {
  const out: Objection[] = [];

  if (facts.returnNote?.trim()) {
    out.push({
      concern: "받아봤는데 생각과 다르면 어떡하지",
      answer: facts.returnNote.trim(),
    });
  }

  if (facts.sameDayShipping) {
    out.push({
      concern: "언제 받을 수 있을까",
      answer: "평일 기준 당일 출고합니다. 주문하신 날 바로 발송됩니다.",
    });
  }

  const concerns = facts.category ? CATEGORY_CONCERNS[facts.category] : undefined;
  if (concerns?.length && facts.specHighlights?.length) {
    // 규격 정보가 있을 때만 규격 관련 불안을 다룬다 — 없으면 빈말이 된다
    out.push({
      concern: concerns[0],
      answer: `아래 상세 정보에 ${facts.specHighlights.slice(0, 2).join(" · ")}를 그대로 적어두었습니다. 구매 전 확인해 주세요.`,
    });
  }

  return out;
}

/**
 * 경쟁 상품과 **실제로 다른 점**만 뽑는다.
 *
 * 쿠파일럿류 도구가 실제로 파는 셀러에게 주는 핵심 가치가 이것이다 —
 * "경쟁사가 못 하고 있는 걸 상세에 박아라". 다만 지어내면 안 되므로
 * 숫자로 확인되는 차이만 문구가 된다.
 */
function buildDifferentiators(facts: ProductFacts): string[] {
  const out: string[] = [];

  if (facts.competitorAvgKrw && facts.competitorAvgKrw > facts.priceKrw) {
    const gap = Math.round(((facts.competitorAvgKrw - facts.priceKrw) / facts.competitorAvgKrw) * 100);
    if (gap >= 5) {
      out.push(`같은 조건 상품 평균가보다 ${gap}% 낮은 가격입니다.`);
    }
  }

  if (facts.freeShipping) {
    out.push("배송비가 따로 붙지 않습니다.");
  }

  if (facts.sameDayShipping) {
    out.push("주문 당일 출고합니다 — 대부분의 경쟁 상품보다 하루 빠릅니다.");
  }

  for (const spec of facts.specHighlights ?? []) {
    if (out.length >= 5) break;
    out.push(spec);
  }

  return out;
}

/**
 * 셀링포인트를 **구매 결정 순서**로 배열한다.
 *
 * 좋은 것부터가 아니라, 사는 사람의 머릿속 순서대로 놓는다:
 * 뭔지(정체) → 얼마나 좋은지(사실) → 실패해도 되는지(안심) → 언제 오는지(속도).
 * 이 순서가 어긋나면 아무리 좋은 정보도 안 읽힌다.
 */
export function buildPersuasionPlan(input: {
  title: string;
  keyword: string;
  facts: ProductFacts;
  /** 상품 설명에서 뽑은 원래 셀링포인트 — 사실 확인된 것만 들어온다 */
  rawSellingPoints?: string[];
}): PersuasionPlan {
  const rejected: string[] = [];
  const { facts } = input;

  const differentiators = buildDifferentiators(facts);
  const objections = buildObjections(facts);

  const ordered: string[] = [];

  // 1) 정체 — 이게 뭔지 한 줄로
  const identity = sanitizeCopy(input.title);
  rejected.push(...identity.removed);

  // 2) 사실 — 숫자로 확인되는 차이
  ordered.push(...differentiators.slice(0, 3));

  // 3) 원래 셀링포인트 중 깨끗한 것만
  for (const raw of input.rawSellingPoints ?? []) {
    if (ordered.length >= 6) break;
    const { clean, removed } = sanitizeCopy(raw);
    rejected.push(...removed);
    if (clean && !ordered.includes(clean)) ordered.push(clean);
  }

  // 4) 안심 — 반품이 되는지
  if (facts.returnNote?.trim() && ordered.length < 7) {
    ordered.push(facts.returnNote.trim());
  }

  return {
    engineVersion: BUYER_PSYCHOLOGY_VERSION,
    sellingPoints: ordered.filter(Boolean),
    objections,
    differentiators,
    rejected: Array.from(new Set(rejected)),
  };
}

/**
 * 설득 계획을 상세페이지 섹션 HTML로 — 과하지 않은 톤을 유지한다.
 *
 * 불안 해소는 자랑 밑에 조용히 놓는다. 크게 외치면 오히려 "뭔가 문제가 있나"로
 * 읽히기 때문에, 정보로 보이게 담담하게 쓴다.
 */
export function renderObjectionsHtml(objections: Objection[]): string {
  if (!objections.length) return "";
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const items = objections
    .map(
      (o) =>
        `<div style="padding:16px 0;border-bottom:1px solid #f1f5f9">` +
        `<p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#0f172a">${escape(o.concern)}</p>` +
        `<p style="margin:0;font-size:14px;line-height:1.7;color:#475569">${escape(o.answer)}</p>` +
        `</div>`,
    )
    .join("");

  return (
    `<section style="margin:48px 0;padding:8px 24px 24px;background:#fafafa;border-radius:16px">` +
    `<h3 style="margin:24px 0 8px;font-size:16px;font-weight:600;color:#0f172a;letter-spacing:-0.01em">구매 전 확인해 주세요</h3>` +
    items +
    `</section>`
  );
}
