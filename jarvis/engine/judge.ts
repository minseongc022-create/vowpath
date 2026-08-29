/**
 * 판단 — 통과한 것 중에서 **고른다**
 *
 * ★ 왜 필요한가
 *
 * 지금까지 소싱은 관문을 통과한 상품을 **발견 순서대로** 집었다
 * (`if (candidates.length >= want) break`). 즉 「휴대폰 거치대」의 1번
 * 상품이 개당 800원 남고 4번 상품이 4,000원 남아도, 늘 1번을 집고
 * 4번은 본 적조차 없이 버려졌다. 관문은 "팔아도 되는가"만 보지
 * "이게 더 나은가"는 안 본다 — 그건 판단이 아니라 수거다.
 *
 * 여기서는 **관문을 통과한 것들을 모아 놓고 점수로 줄을 세운다.**
 * 하루에 4개만 만들 수 있다면, 본 것 중 가장 좋은 4개여야 한다.
 *
 * ★ 점수는 지어내지 않는다
 *
 * 모든 항목은 이미 **실측된 값**만 쓴다(원가·마진은 낱개 확정가에서,
 * 사진 수는 공급처가 실제로 올린 장수, 공급처 신호는 판독된 것만).
 * 추정치로 점수를 만들면 "왜 이걸 골랐나"에 답할 수 없고, 답할 수 없는
 * 선택은 사장님이 검수할 수도 없다. 그래서 점수마다 이유를 같이 남긴다.
 */

import type { Candidate } from "../core/types";
import { MIN_NET_PROFIT_KRW, MIN_MARGIN_PCT } from "../core/rules";

export const JUDGE_VERSION = "1.0";

/**
 * 이 금액이면 "잘 남는 상품"으로 본다 — 만점 기준.
 *
 * 하루 목표를 채우는 건 마진율(%)이 아니라 실제로 손에 남는 원이다.
 * 관문 하한(MIN_NET_PROFIT_KRW=2,500원)의 네 배쯤을 만점으로 두면,
 * 하한을 겨우 넘긴 상품과 넉넉히 남는 상품이 확실히 갈린다.
 */
const PROFIT_FULL_MARK_KRW = MIN_NET_PROFIT_KRW * 4;

/** 이 마진율이면 가격 경쟁이 붙어도 버틸 여유가 있다고 본다 */
const MARGIN_FULL_MARK_PCT = 40;

/**
 * 상세페이지가 설득력을 갖는 최소 사진 수.
 *
 * 사진이 한 장뿐인 상세페이지는 실제로 전환이 안 된다. 그렇다고 없는
 * 각도를 지어낼 수는 없으니(상품 왜곡이다), 사진을 많이 준 공급처를
 * 고르는 쪽으로 판단한다 — 이게 정직하게 페이지 품질을 올리는 방법이다.
 */
const IMAGES_FULL_MARK = 5;

export type JudgeSignal = {
  /** 0~1 */
  score: number;
  /** 사장님이 읽을 한 줄 — 왜 이 점수인지 */
  note: string;
};

export type Judgement = {
  /** 0~100. 높을수록 먼저 만든다 */
  score: number;
  /** 점수를 가른 근거 — 검수 화면에 그대로 보여준다 */
  reasons: string[];
};

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/** 개당 순이익 — 목표를 채우는 건 결국 원이다 */
function judgeProfit(c: Candidate): JudgeSignal {
  const score = clamp01(c.netProfitKrw / PROFIT_FULL_MARK_KRW);
  return {
    score,
    note: `개당 ${c.netProfitKrw.toLocaleString()}원 남음`,
  };
}

/** 실마진 — 경쟁이 붙었을 때 내려도 버틸 여유가 있는가 */
function judgeMargin(c: Candidate): JudgeSignal {
  const span = MARGIN_FULL_MARK_PCT - MIN_MARGIN_PCT;
  const score = clamp01((c.marginPct - MIN_MARGIN_PCT) / span);
  return { score, note: `실마진 ${c.marginPct}%` };
}

/**
 * 검색어와 상품이 얼마나 같은 물건인가.
 *
 * 관문(MIN_RELEVANCE)은 "전혀 다른 물건"만 막는다. 아슬아슬하게 통과한
 * 상품은 제목·검색 노출·광고 문구가 전부 흐릿해진다 — 팔리지 않는
 * 이유가 여기서 갈리므로 점수에 넣는다.
 */
function judgeRelevance(c: Candidate): JudgeSignal {
  if (c.relevance == null) {
    // 옛 초안에는 이 값이 없다. 모르면 중간값 — 없는 근거로 상 주지도,
    // 벌하지도 않는다.
    return { score: 0.5, note: "검색어 적합도 미기록" };
  }
  return {
    score: clamp01(c.relevance),
    note: `검색어 적합도 ${Math.round(c.relevance * 100)}%`,
  };
}

/** 공급처가 사진을 몇 장이나 줬는가 — 상세페이지 설득력이 여기서 갈린다 */
function judgeImages(c: Candidate): JudgeSignal {
  const n = c.supplier.imageUrls.length;
  const score = clamp01(n / IMAGES_FULL_MARK);
  return { score, note: `공급처 사진 ${n}장` };
}

/**
 * 사진이 몇 장이든, 그 사진이 실제로 사고 싶게 만드는가.
 *
 * "아무도 안 살거같은 비주얼"이 실제로 문제였다 — 개수(judgeImages)만
 * 보면 흐릿하고 조악한 사진도 여러 장이면 만점을 받는다. AI가 실제로
 * 사진을 봐야만 답할 수 있는 값이라 sourcing.ts에서 미리 판단해 candidate에
 * 실어 온다. 시간이 없어 못 봤으면(undefined) 중립 — 못 봤다고 벌하지 않는다.
 */
function judgeAppeal(c: Candidate): JudgeSignal {
  if (c.visualAppeal == null) {
    return { score: 0.5, note: "사진 품질 미판단" };
  }
  return {
    score: clamp01(c.visualAppeal),
    note: c.visualAppealNote ?? `사진 품질 점수 ${Math.round(c.visualAppeal * 100)}%`,
  };
}

/**
 * 배송비가 원가에서 차지하는 비중.
 *
 * 배송비 비중이 크면 반품 한 건에 왕복 배송비가 마진을 통째로 먹는다.
 * 같은 순이익이라면 배송비가 적은 쪽이 실제로 더 안전한 상품이다.
 */
function judgeShipping(c: Candidate): JudgeSignal {
  const { shippingKrw, landedCostKrw } = c.supplier;
  if (landedCostKrw <= 0) return { score: 0.5, note: "배송비 비중 미확인" };
  const ratio = shippingKrw / landedCostKrw;
  if (shippingKrw === 0) return { score: 1, note: "입고 배송비 없음" };
  return {
    score: clamp01(1 - ratio * 2),
    note: `입고 배송비 ${shippingKrw.toLocaleString()}원 (원가의 ${Math.round(ratio * 100)}%)`,
  };
}

/**
 * 실시간 조회로 확정된 공급처인가.
 *
 * 검색 결과 추정으로 남아 있는 공급처는 발주 시점에 값이 다를 수 있다.
 * 관문에서 막을 일은 아니지만, 같은 조건이면 확정된 쪽을 먼저 만든다.
 */
function judgeSupplier(c: Candidate): JudgeSignal {
  return c.supplier.live
    ? { score: 1, note: "공급처 실시간 확인됨" }
    : { score: 0.4, note: "공급처가 검색 결과 기반 — 발주 전 확인 필요" };
}

/**
 * 가중치. 합이 100이 되게 두어 점수를 그대로 읽을 수 있게 한다.
 *
 * 순이익이 가장 무겁다 — 목표(월 매출)는 마진율이 아니라 금액으로
 * 채워지기 때문이다. 그다음이 마진율(버틸 여유). "아무도 안 살거같은
 * 비주얼"이 실제로 문제였던 만큼, 사진 품질(appeal)도 적합도만큼
 * 무겁게 둔다 — 사진 개수(images)와는 다른 값이다.
 */
const WEIGHTS = {
  profit: 30,
  margin: 18,
  relevance: 13,
  appeal: 15,
  images: 9,
  shipping: 8,
  supplier: 7,
} as const;

export function judgeCandidate(c: Candidate): Judgement {
  const signals: Array<[keyof typeof WEIGHTS, JudgeSignal]> = [
    ["profit", judgeProfit(c)],
    ["margin", judgeMargin(c)],
    ["relevance", judgeRelevance(c)],
    ["appeal", judgeAppeal(c)],
    ["images", judgeImages(c)],
    ["shipping", judgeShipping(c)],
    ["supplier", judgeSupplier(c)],
  ];

  let score = 0;
  for (const [key, signal] of signals) score += signal.score * WEIGHTS[key];

  // 근거는 점수를 가장 많이 움직인 순으로 — 사장님이 위 세 줄만 읽어도
  // 왜 이 상품인지 알 수 있어야 한다
  const reasons = signals
    .map(([key, signal]) => ({ note: signal.note, weight: signal.score * WEIGHTS[key] }))
    .sort((a, b) => b.weight - a.weight)
    .map((r) => r.note);

  return { score: Math.round(score), reasons };
}

/**
 * 관문을 통과한 후보들 중 **좋은 순으로** 고른다.
 *
 * 같은 검색어에서 여러 개가 올라오면 한 검색어가 하루치를 다 차지해
 * 상품 구성이 한쪽으로 쏠린다. 검색어당 하나씩 먼저 채우고, 그래도
 * 자리가 남으면 나머지 중 좋은 순으로 채운다.
 */
export function pickBest(candidates: Candidate[], want: number): Candidate[] {
  if (want <= 0) return [];

  const scored = candidates
    .map((c) => ({ c, j: judgeCandidate(c) }))
    .sort((a, b) => b.j.score - a.j.score);

  const picked: Candidate[] = [];
  const usedKeywords = new Set<string>();

  for (const { c, j } of scored) {
    if (picked.length >= want) break;
    if (usedKeywords.has(c.keyword)) continue;
    usedKeywords.add(c.keyword);
    picked.push({ ...c, score: j.score, scoreReasons: j.reasons });
  }

  // 검색어가 모자라 다 못 채웠으면 남은 것 중 좋은 순으로
  for (const { c, j } of scored) {
    if (picked.length >= want) break;
    if (picked.some((p) => p.id === c.id)) continue;
    picked.push({ ...c, score: j.score, scoreReasons: j.reasons });
  }

  return picked;
}
