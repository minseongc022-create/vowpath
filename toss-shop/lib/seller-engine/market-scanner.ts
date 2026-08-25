/**
 * 시장 스캐너 — "이 키워드에 지금 들어가면 이길 수 있는가"
 *
 * ★ 왜 점수 하나로 줄 세우면 안 되는가
 *
 * 기존 랭킹은 `검색량 / 경쟁강도` 하나로 키워드를 줄 세웠다. 그건 "사람들이 많이
 * 찾는다"만 보는 것이고, 신규 셀러가 실제로 **뚫을 수 있는가**는 전혀 못 본다.
 * 검색량이 아무리 많아도 상위가 리뷰 3천 개짜리 대형셀러로 도배돼 있으면
 * 광고비만 태우고 끝난다. 돈을 버는 셀러는 그런 키워드를 애초에 안 건드린다.
 *
 * ★ 그래서 네 가지를 따로 본다
 *
 *  1. 수요/경쟁 — 검색량 대비 등록 상품 수. 이게 낮으면 아무리 커도 레드오션.
 *  2. 리뷰 장벽 — 상위 경쟁자의 리뷰 중앙값. 신규가 초기 노출을 못 받는 진짜 이유.
 *  3. 대형셀러 장악도 — 상위를 소수 대형셀러가 잡고 있으면 가격으로도 안 뚫린다.
 *  4. 가격 여지 — 최저가와 평균가의 간격. 여기가 넓어야 마진을 지키며 파고든다.
 *
 * 하나라도 치명적이면 다른 셋이 좋아도 들어가지 않는다. 이게 사람이 하는 판단이다.
 *
 * ★ 없는 데이터를 지어내지 않는다
 *
 * "2~3개월 뒤 오를 키워드"는 시계열이 있어야 알 수 있다. 스냅샷이 쌓이지 않았으면
 * 추세를 계산하지 않고 `momentum: undefined`로 둔다. 추세를 지어내면 그 위에
 * 광고비가 실린다 — 확실성 게이트와 같은 원칙이다.
 */

import type { CatalogProduct, MarketKeywordMetrics } from "../types";

export const MARKET_SCANNER_VERSION = "1.0";

/**
 * 판정 기준 — 왜 이 숫자인지 함께 남긴다.
 *
 * 임계값은 임의로 정하면 나중에 아무도 못 고친다. 각 값이 무엇을 막으려는
 * 것인지 적어두면, 실적이 쌓였을 때 근거를 갖고 조정할 수 있다.
 */
export const SCAN_THRESHOLDS = {
  /** 상품 1개당 월 검색 수요. 이보다 낮으면 이미 공급 과잉이다. */
  minDemandPerCompetitor: 3,
  /**
   * 상위 경쟁자 리뷰 중앙값 상한. 리뷰는 신규 셀러가 돈으로 살 수 없는 유일한
   * 자산이라, 이 선을 넘으면 초기 노출 자체가 안 나온다.
   */
  maxReviewBarrier: 500,
  /** 상위를 대형셀러가 이만큼 넘게 잡고 있으면 가격으로도 안 뚫린다 (%) */
  maxBigSellerSharePct: 70,
  /** 대형셀러로 볼 리뷰 수 — 이 정도면 이미 카탈로그를 장악한 축이다 */
  bigSellerReviewCount: 300,
  /** 최저가가 평균가보다 이만큼은 낮아야 파고들 가격 여지가 있다 (%) */
  minPriceHeadroomPct: 8,
} as const;

export type ScanVerdict =
  /** 지금 들어가도 되는 키워드 */
  | "enter"
  /** 지금은 아니지만 지켜볼 값어치는 있다 */
  | "watch"
  /** 들어가면 광고비만 태운다 */
  | "skip";

export type OpportunityScan = {
  keyword: string;
  verdict: ScanVerdict;
  /** 검색 수요 ÷ 등록 상품 수 */
  demandPerCompetitor: number;
  /** 상위 경쟁자 리뷰 중앙값 */
  reviewBarrier: number;
  /** 상위를 대형셀러가 차지한 비율 (%) */
  bigSellerSharePct: number;
  /** 최저가가 평균가보다 낮은 정도 (%) — 클수록 가격으로 파고들 여지 */
  priceHeadroomPct: number;
  /** 들어가면 안 되는 이유 — 하나라도 있으면 skip */
  blockers: string[];
  /** 들어가도 되는 이유 */
  reasons: string[];
  /**
   * · `measured`   — 실제 시장 지표와 카탈로그 경쟁자를 모두 봤다
   * · `partial`    — 한쪽만 있다. 판정은 하되 근거가 약하다
   * · `unmeasured` — 근거가 없다. 어떤 경우에도 enter를 주지 않는다
   */
  dataQuality: "measured" | "partial" | "unmeasured";
  /** 경쟁자 표본 수 */
  competitorSample: number;
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** 이 키워드로 실제 경쟁하게 될 상품들 */
function competitorsFor(keyword: string, catalog: CatalogProduct[]): CatalogProduct[] {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return [];
  const parts = kw.split(/\s+/).filter((p) => p.length >= 2);
  return catalog.filter((p) => {
    const name = p.name.toLowerCase();
    return name.includes(kw) || parts.some((part) => name.includes(part));
  });
}

export type ScanInput = {
  keyword: string;
  catalog: CatalogProduct[];
  metrics?: MarketKeywordMetrics;
};

/**
 * 키워드 하나를 네 축으로 판정한다.
 *
 * 치명적 결격(blocker)이 하나라도 있으면 `skip`이다. 나머지 축이 아무리 좋아도
 * 뒤집지 않는다 — 리뷰 3천 개짜리 상위권을 검색량으로 이길 수는 없기 때문이다.
 */
export function scanOpportunity(input: ScanInput): OpportunityScan {
  const { keyword, catalog, metrics } = input;
  const competitors = competitorsFor(keyword, catalog);
  const blockers: string[] = [];
  const reasons: string[] = [];

  // ⚠️ 시장 지표는 매칭 상품이 없을 때 키워드 해시로 채워진다(market-collector).
  // 그 숫자는 그럴듯하지만 시장과 무관하므로 **근거로 쓰지 않는다**.
  // 이걸 실측으로 착각하면 없는 수요에 광고비를 태우게 된다.
  const hasMetrics = Boolean(metrics && metrics.searchVolume > 0 && metrics.basis === "catalog");
  const syntheticMetrics = metrics?.basis === "synthetic";
  const hasCompetitors = competitors.length > 0;
  const dataQuality: OpportunityScan["dataQuality"] =
    hasMetrics && hasCompetitors ? "measured" : hasMetrics || hasCompetitors ? "partial" : "unmeasured";

  // ── 1) 수요 대비 공급 ──────────────────────────────────────────
  const productCount = metrics?.productCount ?? competitors.length;
  const demandPerCompetitor =
    hasMetrics && productCount > 0
      ? Math.round(((metrics as MarketKeywordMetrics).searchVolume / productCount) * 10) / 10
      : 0;

  if (hasMetrics) {
    if (demandPerCompetitor < SCAN_THRESHOLDS.minDemandPerCompetitor) {
      blockers.push(
        `상품 1개당 검색 수요가 ${demandPerCompetitor} — 이미 공급 과잉입니다(기준 ${SCAN_THRESHOLDS.minDemandPerCompetitor} 이상).`,
      );
    } else {
      reasons.push(`상품 1개당 검색 수요 ${demandPerCompetitor} — 수요가 공급보다 앞섭니다.`);
    }
  }

  // ── 2) 리뷰 장벽 ──────────────────────────────────────────────
  //
  // 리뷰는 신규 셀러가 돈으로 살 수 없다. 상위가 리뷰로 굳어 있으면
  // 광고를 태워도 클릭이 전환으로 안 이어진다.
  const reviewBarrier = median(competitors.map((c) => c.reviewCount ?? 0));
  if (hasCompetitors) {
    if (reviewBarrier > SCAN_THRESHOLDS.maxReviewBarrier) {
      blockers.push(
        `상위 경쟁자 리뷰 중앙값이 ${reviewBarrier.toLocaleString()}개 — 신규 셀러가 초기 노출을 받기 어렵습니다(기준 ${SCAN_THRESHOLDS.maxReviewBarrier}개 이하).`,
      );
    } else {
      reasons.push(`리뷰 장벽이 낮습니다 (중앙값 ${reviewBarrier.toLocaleString()}개).`);
    }
  }

  // ── 3) 대형셀러 장악도 ────────────────────────────────────────
  const bigSellers = competitors.filter(
    (c) => (c.reviewCount ?? 0) >= SCAN_THRESHOLDS.bigSellerReviewCount,
  );
  const bigSellerSharePct = hasCompetitors
    ? Math.round((bigSellers.length / competitors.length) * 100)
    : 0;
  if (hasCompetitors) {
    if (bigSellerSharePct > SCAN_THRESHOLDS.maxBigSellerSharePct) {
      blockers.push(
        `상위 ${bigSellerSharePct}%를 대형셀러가 잡고 있습니다 — 가격으로도 뚫기 어렵습니다(기준 ${SCAN_THRESHOLDS.maxBigSellerSharePct}% 이하).`,
      );
    } else if (bigSellerSharePct < 40) {
      reasons.push(`대형셀러 장악도가 ${bigSellerSharePct}%로 낮아 신규가 자리를 잡을 여지가 있습니다.`);
    }
  }

  // ── 4) 가격 여지 ──────────────────────────────────────────────
  //
  // 최저가가 평균가와 붙어 있으면 이미 바닥까지 내려간 시장이다.
  // 여기 들어가면 마진을 깎는 것 말고 할 수 있는 게 없다.
  const prices = competitors.map((c) => c.priceKrw).filter((p) => p > 0);
  const avgPrice = prices.length
    ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    : (metrics?.avgPriceKrw ?? 0);
  const lowPrice = prices.length ? Math.min(...prices) : 0;
  const priceHeadroomPct =
    avgPrice > 0 && lowPrice > 0 ? Math.round(((avgPrice - lowPrice) / avgPrice) * 100) : 0;

  if (prices.length >= 3) {
    if (priceHeadroomPct < SCAN_THRESHOLDS.minPriceHeadroomPct) {
      blockers.push(
        `최저가와 평균가 차이가 ${priceHeadroomPct}%뿐입니다 — 이미 가격이 바닥이라 마진을 지키며 파고들 여지가 없습니다.`,
      );
    } else {
      reasons.push(`최저가와 평균가 차이가 ${priceHeadroomPct}%로 가격 진입 여지가 있습니다.`);
    }
  }

  // ── 판정 ──────────────────────────────────────────────────────
  //
  // 근거가 아예 없으면 어떤 경우에도 enter를 주지 않는다. 모르는 시장에
  // 들어가는 건 도박이지 판단이 아니다.
  let verdict: ScanVerdict;
  if (dataQuality === "unmeasured") {
    verdict = "watch";
    blockers.push(
      syntheticMetrics
        ? "이 키워드에 매칭되는 실제 상품이 없어 시장 지표가 자리표시자입니다 — 실제 수요가 확인되기 전엔 들어가지 않습니다."
        : "시장 지표도 경쟁자 표본도 없어 판단 근거가 없습니다 — 데이터가 쌓이기 전엔 들어가지 않습니다.",
    );
  } else if (blockers.length) {
    // 결격이 하나뿐이고 나머지가 강하면 "지켜본다", 여러 개면 버린다
    verdict = blockers.length === 1 && reasons.length >= 2 ? "watch" : "skip";
  } else {
    verdict = dataQuality === "measured" ? "enter" : "watch";
  }

  return {
    keyword,
    verdict,
    demandPerCompetitor,
    reviewBarrier,
    bigSellerSharePct,
    priceHeadroomPct,
    blockers,
    reasons,
    dataQuality,
    competitorSample: competitors.length,
  };
}

/**
 * 키워드 묶음을 훑어 **지금 들어갈 수 있는 것부터** 돌려준다.
 *
 * 정렬은 검색량이 아니라 "뚫릴 가능성"이 먼저다. 검색량 1위지만 리뷰 장벽이
 * 높은 키워드보다, 검색량 10위여도 비어 있는 키워드가 실제로 돈이 된다.
 */
export function scanMarket(input: {
  keywords: string[];
  catalog: CatalogProduct[];
  marketKeywords?: Record<string, MarketKeywordMetrics>;
  limit?: number;
}): {
  enter: OpportunityScan[];
  watch: OpportunityScan[];
  /** 들어가면 안 되는 키워드 — 호출부가 후보에서 빼야 하므로 목록으로 돌려준다 */
  skip: OpportunityScan[];
  skipped: number;
} {
  const seen = new Set<string>();
  const scans: OpportunityScan[] = [];

  for (const keyword of input.keywords) {
    const k = keyword.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    scans.push(scanOpportunity({ keyword: k, catalog: input.catalog, metrics: input.marketKeywords?.[k] }));
  }

  const rank = (s: OpportunityScan) =>
    s.demandPerCompetitor * 2 +
    Math.max(0, SCAN_THRESHOLDS.maxReviewBarrier - s.reviewBarrier) / 100 +
    Math.max(0, SCAN_THRESHOLDS.maxBigSellerSharePct - s.bigSellerSharePct) / 10 +
    s.priceHeadroomPct / 5;

  const enter = scans.filter((s) => s.verdict === "enter").sort((a, b) => rank(b) - rank(a));
  const watch = scans.filter((s) => s.verdict === "watch").sort((a, b) => rank(b) - rank(a));
  const skip = scans.filter((s) => s.verdict === "skip");

  const limit = input.limit ?? 20;
  return {
    enter: enter.slice(0, limit),
    watch: watch.slice(0, limit),
    skip,
    skipped: skip.length,
  };
}
