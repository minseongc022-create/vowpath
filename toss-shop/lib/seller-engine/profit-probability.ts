/**
 * 수익 확률 엔진 — SKU별 "돈 벌 확률"과 포트폴리오 "월 목표 달성 확률"을
 * 점추정이 아니라 **분포**로 계산한다.
 *
 * 왜 분포인가:
 * 기존 estimateDailyUnits()는 숫자 하나만 준다. 숫자 하나로는 "확률 몇 %"를
 * 말할 수 없다. 확률을 말하려면 불확실성의 크기를 알아야 하고, 그래서
 * 몬테카를로로 월 순익 분포를 만든 뒤 목표선을 넘는 비율을 센다.
 *
 * 이 모델이 정직하게 반영하는 것 (= 실제로 돈과 직결되는 것):
 *  1) 노출(랭킹) — 신규 리스팅이 1페이지에 뜨는지가 매출의 최대 분기점.
 *     리뷰 0개로 시작하므로 초기 노출 확률은 경쟁강도·리뷰격차에 크게 좌우.
 *  2) 수요 불확실성 — 토스는 공식 검색량 API가 없다. 그래서 dataQuality가
 *     demo면 σ를 크게 잡는다. 데이터가 나쁘면 확률도 넓게 나오는 게 정직하다.
 *  3) 단위 순익 — 수수료·배송비 반영 후 실제 남는 돈.
 *  4) 램프업 — 신규 SKU는 첫 달에 정상 판매량이 안 나온다.
 *
 * ⚠️ 한계(속이지 않기): 입력값(검색량·전환율)이 추정이면 출력 확률도 추정이다.
 * 이 모델은 "확률을 만들어내는" 게 아니라 "입력의 불확실성을 확률로 옮기는"
 * 장치다. 그래서 dataQuality가 demo면 confidence를 'low'로 표기한다.
 */

import type { TossShopCategory } from "../types";

export const PROFIT_PROBABILITY_VERSION = "1.0";

export type DataQuality = "live" | "mixed" | "demo";

/** 결정적(seeded) RNG — 같은 입력이면 같은 확률이 나와야 UI/테스트가 안정적 */
function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

/** Box-Muller 표준정규 */
function normal(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  const v = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 수요 추정의 불확실성(로그정규 σ) — 데이터 품질이 나쁘면 크게 */
function demandSigma(q: DataQuality): number {
  return q === "live" ? 0.45 : q === "mixed" ? 0.75 : 1.15;
}

export type SkuProbabilityInput = {
  /** 확률 재현용 키 (같은 SKU면 같은 결과) */
  seedKey: string;
  keyword: string;
  category: TossShopCategory;
  /** 기존 엔진의 일 판매량 점추정 */
  baselineDailyUnits: number;
  /** 단위당 순익(수수료·공급가 차감 후) */
  netProfitPerUnitKrw: number;
  competitionIntensity: number;
  searchVolume: number;
  dataQuality: DataQuality;
  /** 경쟁사 평균 리뷰수 — 신규 리스팅의 노출 장벽 */
  competitorAvgReviews?: number;
  /** 제목/키워드 최적화 점수 0–100 (SEO 엔진 결과) */
  seoScore?: number;
  /** 가격 경쟁력: 최저가 대비 비율 (1.0 = 최저가와 동일) */
  priceRatioVsLow?: number;
  /** 시뮬레이션 횟수 */
  trials?: number;
};

export type SkuProbability = {
  /** 1페이지 노출 확률 */
  page1Prob: number;
  /** 월 순익 분포 */
  p10Krw: number;
  p50Krw: number;
  p90Krw: number;
  expectedKrw: number;
  /** 월 순익이 10만 원 이상일 확률 = "의미 있는 수익" */
  probMeaningful: number;
  /** 월 순익이 50만 원 이상일 확률 = "효자 SKU" */
  probStrong: number;
  /** 확률 산출의 신뢰도 — 입력 데이터 품질에 따름 */
  confidence: "high" | "medium" | "low";
  reason: string;
};

/**
 * 신규 리스팅이 검색 1페이지에 노출될 확률.
 * 토스 공식 랭킹 API가 없으므로 일반적 마켓플레이스 랭킹 요인으로 추정한다:
 * 경쟁강도(↓), 리뷰격차(↓), 제목/키워드 최적화(↑), 가격경쟁력(↑).
 */
export function estimatePage1Probability(input: {
  competitionIntensity: number;
  competitorAvgReviews?: number;
  seoScore?: number;
  priceRatioVsLow?: number;
}): number {
  // 로짓 모델: 각 요인이 log-odds에 가산
  let logit = 0.9; // 기본 (틈새라면 신규도 노출 가능)

  logit -= input.competitionIntensity * 0.75;

  const reviews = input.competitorAvgReviews ?? 0;
  // 리뷰 장벽: 경쟁사 리뷰가 많을수록 신규가 뚫기 어렵다 (로그 스케일)
  logit -= Math.log10(1 + reviews) * 0.55;

  const seo = (input.seoScore ?? 50) / 100;
  logit += (seo - 0.5) * 2.2; // 제목·키워드 최적화의 실제 영향

  const pr = input.priceRatioVsLow ?? 1.05;
  if (pr <= 1.0) logit += 0.5;
  else if (pr <= 1.05) logit += 0.15;
  else if (pr <= 1.15) logit -= 0.35;
  else logit -= 0.9;

  const p = 1 / (1 + Math.exp(-logit));
  return Math.round(Math.min(0.95, Math.max(0.03, p)) * 1000) / 1000;
}

export function computeSkuProbability(input: SkuProbabilityInput): SkuProbability {
  const trials = input.trials ?? 4000;
  const rng = makeRng(hashSeed(input.seedKey));
  const sigma = demandSigma(input.dataQuality);

  const page1Prob = estimatePage1Probability({
    competitionIntensity: input.competitionIntensity,
    competitorAvgReviews: input.competitorAvgReviews,
    seoScore: input.seoScore,
    priceRatioVsLow: input.priceRatioVsLow,
  });

  // 1페이지 밖이면 판매량이 급감한다 (노출량 자체가 사라짐)
  const OFF_PAGE1_FACTOR = 0.12;
  // 신규 SKU 첫 달 램프업 (리뷰·판매이력 누적 전)
  const RAMP = 0.62;

  const monthly: number[] = [];
  for (let i = 0; i < trials; i++) {
    const onPage1 = rng() < page1Prob;
    const exposure = onPage1 ? 1 : OFF_PAGE1_FACTOR;
    // 로그정규 수요 충격
    const shock = Math.exp(normal(rng) * sigma - (sigma * sigma) / 2);
    const units = input.baselineDailyUnits * 30 * RAMP * exposure * shock;
    monthly.push(units * input.netProfitPerUnitKrw);
  }
  monthly.sort((a, b) => a - b);

  const at = (q: number) => Math.round(monthly[Math.min(trials - 1, Math.floor(trials * q))]);
  const expected = Math.round(monthly.reduce((a, b) => a + b, 0) / trials);
  const share = (threshold: number) =>
    Math.round((monthly.filter((v) => v >= threshold).length / trials) * 1000) / 10;

  const confidence: SkuProbability["confidence"] =
    input.dataQuality === "live" ? "high" : input.dataQuality === "mixed" ? "medium" : "low";

  return {
    page1Prob,
    p10Krw: at(0.1),
    p50Krw: at(0.5),
    p90Krw: at(0.9),
    expectedKrw: expected,
    probMeaningful: share(100_000),
    probStrong: share(500_000),
    confidence,
    reason:
      `1페이지 노출 ${Math.round(page1Prob * 100)}% · 월순익 중앙값 ${Math.round(at(0.5) / 10000)}만 · ` +
      (confidence === "low"
        ? "데이터 demo — 확률 폭 넓음(토스 실검색량 미연동)"
        : confidence === "medium"
          ? "데이터 mixed — 일부 추정 포함"
          : "실데이터 기반"),
  };
}

export type PortfolioGoalInput = {
  skus: Array<{
    seedKey: string;
    baselineDailyUnits: number;
    netProfitPerUnitKrw: number;
    competitionIntensity: number;
    competitorAvgReviews?: number;
    seoScore?: number;
    priceRatioVsLow?: number;
  }>;
  dataQuality: DataQuality;
  goalKrw: number;
  trials?: number;
};

export type PortfolioGoal = {
  /** 월 목표(기본 1,000만) 달성 확률 % */
  goalProbPct: number;
  expectedKrw: number;
  p10Krw: number;
  p50Krw: number;
  p90Krw: number;
  skuCount: number;
  confidence: "high" | "medium" | "low";
  /**
   * 이 확률을 의사결정에 써도 되는가.
   * demo 데이터(토스 실검색량·실공급가 미연동)로 나온 확률은 입력이 가짜라
   * 출력도 가짜다. 이 경우 false — 숫자를 목표 달성 근거로 쓰면 안 된다.
   */
  trustworthy: boolean;
  /** 목표 미달 시 무엇이 더 필요한가 (역산) */
  gap: {
    shortfallKrw: number;
    /** 현재 SKU 평균 기대수익 기준, 목표 확률까지 필요한 추가 SKU 수 */
    moreSkusNeeded: number;
    note: string;
  };
};

/**
 * 포트폴리오 전체가 월 목표를 넘을 확률.
 * SKU들의 월 순익을 각각 시뮬레이션해 합산한 뒤 목표선 초과 비율을 센다.
 * (SKU간 독립 가정 — 같은 카테고리 다수면 실제로는 상관이 있어 낙관 편향이
 *  생길 수 있으므로 correlationDrag로 보수적으로 깎는다.)
 */
export function computePortfolioGoal(input: PortfolioGoalInput): PortfolioGoal {
  const trials = input.trials ?? 3000;
  const sigma = demandSigma(input.dataQuality);
  const OFF_PAGE1_FACTOR = 0.12;
  const RAMP = 0.62;
  // SKU간 수요 상관 — 완전 독립 가정은 합계 분산을 과소평가한다
  const CORRELATION_DRAG = 0.92;

  const totals: number[] = [];
  const rng = makeRng(hashSeed(input.skus.map((s) => s.seedKey).join("|") || "empty"));

  const page1 = input.skus.map((s) =>
    estimatePage1Probability({
      competitionIntensity: s.competitionIntensity,
      competitorAvgReviews: s.competitorAvgReviews,
      seoScore: s.seoScore,
      priceRatioVsLow: s.priceRatioVsLow,
    }),
  );

  for (let t = 0; t < trials; t++) {
    // 시장 공통 충격 (전체 SKU에 함께 작용)
    const market = Math.exp(normal(rng) * sigma * 0.35 - Math.pow(sigma * 0.35, 2) / 2);
    let sum = 0;
    for (let i = 0; i < input.skus.length; i++) {
      const s = input.skus[i];
      const onPage1 = rng() < page1[i];
      const exposure = onPage1 ? 1 : OFF_PAGE1_FACTOR;
      const shock = Math.exp(normal(rng) * sigma * 0.9 - Math.pow(sigma * 0.9, 2) / 2);
      const units = s.baselineDailyUnits * 30 * RAMP * exposure * shock * market;
      sum += units * s.netProfitPerUnitKrw;
    }
    totals.push(sum * CORRELATION_DRAG);
  }
  totals.sort((a, b) => a - b);

  const at = (q: number) => Math.round(totals[Math.min(trials - 1, Math.floor(trials * q))]);
  const expected = Math.round(totals.reduce((a, b) => a + b, 0) / trials);
  const goalProbPct =
    Math.round((totals.filter((v) => v >= input.goalKrw).length / trials) * 1000) / 10;

  const shortfall = Math.max(0, input.goalKrw - expected);
  const perSku = input.skus.length ? expected / input.skus.length : 0;
  const moreSkusNeeded = perSku > 0 ? Math.ceil(shortfall / perSku) : 0;

  const confidence: PortfolioGoal["confidence"] =
    input.dataQuality === "live" ? "high" : input.dataQuality === "mixed" ? "medium" : "low";

  const trustworthy = input.dataQuality !== "demo";

  return {
    goalProbPct,
    expectedKrw: expected,
    p10Krw: at(0.1),
    p50Krw: at(0.5),
    p90Krw: at(0.9),
    skuCount: input.skus.length,
    confidence,
    trustworthy,
    gap: {
      shortfallKrw: shortfall,
      moreSkusNeeded,
      note: !trustworthy
        ? `⚠ demo 데이터 기준 — 이 확률(${goalProbPct}%)은 근거로 쓸 수 없음. ` +
          `토스 API·도매꾹 API를 연동해야 실제 달성확률이 산출된다.`
        : shortfall <= 0
          ? `기대 월순익 ${Math.round(expected / 10000)}만 — 목표 상회. 달성확률 ${goalProbPct}%`
          : `기대 ${Math.round(expected / 10000)}만 · 목표까지 ${Math.round(shortfall / 10000)}만 부족 → ` +
            `현재 SKU 평균(${Math.round(perSku / 10000)}만) 기준 약 ${moreSkusNeeded}개 추가 필요`,
    },
  };
}
