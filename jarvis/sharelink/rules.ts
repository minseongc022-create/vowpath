/**
 * 쉐어링크 상품 선별 기준 — 단일 진실원
 *
 * ★ 여기서 최적화하는 건 "잘 팔릴 상품"이 아니라 "클릭될 상품"이다
 *
 * 쉐어링크는 24시간 쿠키다 — 링크를 클릭한 사람이 그 상품이 아니라 그 24시간
 * 안에 토스쇼핑에서 산 **다른 모든 것**에 대해서도 수익이 잡힌다. 그래서
 * "이 상품 마진이 좋은가"가 아니라 "이 상품이 클릭을 얼마나 끌어내는가"가
 * 기준이다 — 할인율·리뷰수·재구매 주기가 짧은 생필품인지를 본다.
 *
 * ★ 표시 의무는 게이트가 아니라 caption.ts의 몫이다
 *
 * "광고/제휴링크 포함" 표기는 상품을 고르는 문제가 아니라 모든 게시물에
 * 예외 없이 붙는 문제라 여기 섞지 않는다. 여기서 걸러도 caption.ts가
 * 빼먹으면 소용없고, caption.ts가 항상 붙이면 여기서 굳이 안 걸러도 된다.
 */

export const SHARELINK_RULES_VERSION = "1.0";

// ─────────────────────────────────────────────────────────────
// 게이트 — 넘으면 후보에서 뺀다
// ─────────────────────────────────────────────────────────────

/** 리뷰 0~10건은 신뢰 신호가 거의 없다 — 클릭해도 안 살 가능성이 높다 */
export const MIN_REVIEW_COUNT = 10;

/** 별점이 있는데 이 아래면 후킹력보다 이탈이 더 크다 */
export const MIN_RATING = 4.0;

/** 판매가 범위 — 너무 싸면 개당 수익(10%)이 무의미하고, 너무 비싸면 충동클릭이 안 된다 */
export const MIN_PRICE_KRW = 1_000;
export const MAX_PRICE_KRW = 50_000;

/** 이미 오늘 올린 상품은 다시 안 올린다 — 같은 채널에 중복 게시로 보인다 */
export type SharelinkGateFailure =
  | "review_too_few"
  | "rating_too_low"
  | "price_out_of_range"
  | "already_posted"
  | "missing_data";

export type SharelinkGateResult =
  | { ok: true }
  | { ok: false; failed: SharelinkGateFailure; reason: string };

const pass: SharelinkGateResult = { ok: true };
const fail = (failed: SharelinkGateFailure, reason: string): SharelinkGateResult => ({
  ok: false,
  failed,
  reason,
});

export function checkSharelinkItem(input: {
  reviewCount: number;
  ratingAvg?: number;
  priceKrw: number;
  productId: string;
  alreadyPostedIds: string[];
}): SharelinkGateResult {
  if (!Number.isFinite(input.priceKrw) || input.priceKrw <= 0) {
    return fail("missing_data", "가격을 읽지 못했습니다");
  }
  if (input.alreadyPostedIds.includes(input.productId)) {
    return fail("already_posted", "오늘 이미 올린 상품입니다");
  }
  if (input.reviewCount < MIN_REVIEW_COUNT) {
    return fail(
      "review_too_few",
      `리뷰 ${input.reviewCount}건 — ${MIN_REVIEW_COUNT}건 미만은 신뢰 신호가 부족합니다`,
    );
  }
  if (input.ratingAvg != null && input.ratingAvg < MIN_RATING) {
    return fail("rating_too_low", `평점 ${input.ratingAvg} — ${MIN_RATING} 미만`);
  }
  if (input.priceKrw < MIN_PRICE_KRW || input.priceKrw > MAX_PRICE_KRW) {
    return fail(
      "price_out_of_range",
      `가격 ${input.priceKrw.toLocaleString()}원 — ${MIN_PRICE_KRW.toLocaleString()}~${MAX_PRICE_KRW.toLocaleString()}원 범위 밖`,
    );
  }
  return pass;
}

// ─────────────────────────────────────────────────────────────
// 점수 — 게이트를 통과한 것들 중 무엇을 먼저 올릴지
// ─────────────────────────────────────────────────────────────

/**
 * 클릭 후킹력 점수 (0~100).
 *
 * 할인율이 클수록, 리뷰가 많을수록(=신뢰), 재구매 주기가 짧은 생필품
 * 카테고리일수록 높다. 절대적인 "정답 점수"가 아니라 **줄 세우는** 용도라
 * 계수를 정교하게 다듬기보다 방향(왜 높은지)이 화면에 그대로 보이는 게
 * 더 중요하다 — `scoreReasons`에 이유를 남긴다.
 */
export function scoreSharelinkItem(input: {
  discountPct?: number;
  reviewCount: number;
  bestSeller?: boolean;
  category?: string;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (input.discountPct != null && input.discountPct > 0) {
    const discountScore = Math.min(40, input.discountPct * 0.5);
    score += discountScore;
    reasons.push(`할인율 ${input.discountPct}%`);
  }

  // 리뷰수는 로그 스케일로 — 1만 건과 3만 건의 신뢰 차이는 100건과 300건의
  // 차이보다 작다. 선형으로 더하면 리뷰수만으로 순위가 결정된다.
  const reviewScore = Math.min(30, Math.log10(Math.max(1, input.reviewCount)) * 8);
  score += reviewScore;
  if (input.reviewCount >= 1000) reasons.push(`리뷰 ${input.reviewCount.toLocaleString()}건`);

  if (input.bestSeller) {
    score += 15;
    reasons.push("베스트판매자");
  }

  if (input.category && REPEAT_PURCHASE_CATEGORIES.has(input.category)) {
    score += 15;
    reasons.push("재구매 주기 짧은 생필품");
  }

  return { score: Math.round(score), reasons };
}

/**
 * 재구매 주기가 짧은 카테고리 — 클릭이 "24시간 안에 뭐라도 사게" 만들
 * 확률이 높다. 카테고리 이름은 쉐어링크 API가 실제로 주는 값을 확인한
 * 뒤 맞춰야 한다 — 지금은 베스트랭킹 화면에서 관찰된 상품군(물티슈,
 * 섬유유연제, 생김치)을 근거로 잡은 추정치다.
 */
const REPEAT_PURCHASE_CATEGORIES = new Set([
  "생활용품",
  "세제",
  "위생용품",
  "식품",
  "신선식품",
  "간편식",
]);

export function describeSharelinkRules(): string[] {
  return [
    `리뷰 ${MIN_REVIEW_COUNT}건 이상, 평점 ${MIN_RATING} 이상만`,
    `판매가 ${MIN_PRICE_KRW.toLocaleString()}~${MAX_PRICE_KRW.toLocaleString()}원`,
    `오늘 이미 올린 상품은 제외`,
    `순위는 "잘 팔릴 상품"이 아니라 "클릭될 상품" 기준 — 할인율·리뷰수·재구매 주기로 매김`,
  ];
}
