/**
 * AI v6 — 토스쇼핑 정책·카탈로그·대표 아이템(바이박스) 엔진
 *
 * 토스쇼핑은 쿠팡 '아이템위너'와 유사하게 **카탈로그 + 대표 아이템** 방식을 사용합니다.
 * - 동일 상품(브랜드·구성·용량 등)은 AI가 하나의 카탈로그로 묶음
 * - **대표 아이템**: 가격·배송조건·판매활동·고객경험 기준으로 1개 셀러가 대표 노출
 * - 비대표 셀러는 "이 상품의 다른 가격"에서 노출
 *
 * Ref: shopping-docs.toss.im/shopping-operations/catalog/guide
 *      service.toss.im/terms/4358 (카탈로그 방식, 대표 아이템)
 */

import type {
  CatalogWinAnalysis,
  PolicyFlag,
  TossPolicyBrief,
  TossShopCategory,
} from "../types";

export const POLICY_ENGINE_VERSION = "v6";

export type { CatalogWinAnalysis, PolicyFlag, TossPolicyBrief };

export const TOSS_POLICY_BRIEF: TossPolicyBrief = {
  engineVersion: POLICY_ENGINE_VERSION,
  catalogModel:
    "동일 상품(브랜드·구성·용량·모델)은 AI 카탈로그로 자동 병합 → 여러 셀러가 한 PDP에서 경쟁",
  representativeItemCriteria: [
    "판매가 + 배송비 **총액** 최저 (Item Winner 핵심)",
    "무료배송·당일/익일 출고(오늘출발) 우대",
    "리뷰·구매확정·CS·페널티 이력 (내부 기준)",
    "상품정보 정확도(오매칭 시 수정 요청)",
  ],
  sellerObligations: [
    "결제 후 3영업일 이내 출고",
    "검색 태그 10개 등록",
    "상품정보 고시·KC/인증 (카테고리별)",
    "허위 재고·가격·직거래 유도 금지 → 페널티",
  ],
  penaltyAvoidance: [
    "카탈로그 오매칭: 구성·용량·색상 정확 기재",
    "쿠폰 중복 악용·허수주문 금지",
    "대표 이미지는 토스 표준화 이미지 사용 가능 — 품질 유지",
  ],
};

const PROHIBITED_KEYWORDS = ["담배", "주류", "총기", "마약", "도박", "성인용품", "불법"];

const CATEGORY_POLICY: Record<
  TossShopCategory,
  { tags: string[]; certNote: string; dispatchTip: string }
> = {
  food: {
    tags: ["유통기한", "원산지", "식품유형", "알레르기"],
    certNote: "식품위생·원산지 표시 · 냉장/냉동 배송 조건 명시",
    dispatchTip: "신선식품은 당일출발 + 아이스박스 필수",
  },
  beauty: {
    tags: ["피부타입", "용량", "전성분", "사용기한"],
    certNote: "화장품 책임판매업·KC 해당 시 인증",
    dispatchTip: "유통기한 1년 이상 잔여 권장",
  },
  home: {
    tags: ["사이즈", "재질", "색상", "AS"],
    certNote: "전기용품 KC · 어린이제품 안전",
    dispatchTip: "대형 상품은 배송비 선결제 정책 명확히",
  },
  digital: {
    tags: ["호환", "모델명", "보증", "정품"],
    certNote: "전파법 KC · 정품 보증",
    dispatchTip: "소형 → 무료배송으로 대표 아이템 유리",
  },
  fashion: {
    tags: ["사이즈", "색상", "소재", "세탁"],
    certNote: "섬유 MIX 표시 · 사이즈 오매칭 주의",
    dispatchTip: "색상·사이즈별 카탈로그 분리 — 오매칭 방지",
  },
  health: {
    tags: ["섭취량", "성분", "보관", "유통기한"],
    certNote: "건강기능식품 GMP·표시광고 준수",
    dispatchTip: "기능성 표현 과장 금지 (페널티)",
  },
};

export function scanPolicyFlags(input: {
  keyword: string;
  productName: string;
  category: TossShopCategory;
  marginPct: number;
  suggestedTitle: string;
}): PolicyFlag[] {
  const flags: PolicyFlag[] = [];
  const text = `${input.keyword} ${input.productName} ${input.suggestedTitle}`.toLowerCase();

  for (const bad of PROHIBITED_KEYWORDS) {
    if (text.includes(bad)) {
      flags.push({ level: "block", code: "PROHIBITED", message: `금지 품목 키워드 '${bad}' — 등록 불가` });
    }
  }

  if (input.marginPct < 8) {
    flags.push({
      level: "warn",
      code: "LOW_MARGIN",
      message: "마진 8% 미만 — 쿠폰·배송비 시 페널티급 적자 위험",
    });
  }

  if (input.suggestedTitle.length > 50) {
    flags.push({
      level: "info",
      code: "TITLE_LONG",
      message: "상품명 50자 내외 권장 — 카탈로그 매칭 정확도↑",
    });
  }

  const cat = CATEGORY_POLICY[input.category];
  flags.push({
    level: "info",
    code: "CATEGORY_CERT",
    message: cat.certNote,
  });

  return flags;
}

export function scoreRepresentativeItemWin(input: {
  priceKrw: number;
  shippingFeeKrw: number;
  competitorPrices: number[];
  competitorShippingEstimate?: number;
  freeShippingRecommended?: boolean;
  reviewCount: number;
  competitionIntensity: number;
  productCount: number;
  dispatchWithinDays?: number;
  marginPct?: number;
}): CatalogWinAnalysis {
  const ship = input.freeShippingRecommended ? 0 : input.shippingFeeKrw;
  const ourTotal = input.priceKrw + ship;
  const compShip = input.competitorShippingEstimate ?? 2500;
  const compTotals =
    input.competitorPrices.length > 0
      ? input.competitorPrices.map((p) =>
          p + (p === Math.min(...input.competitorPrices) ? 0 : compShip),
        )
      : [];
  const bestCompetitorTotal = compTotals.length ? Math.min(...compTotals) : ourTotal;
  const priceGapKrw = bestCompetitorTotal - ourTotal;

  let repScore = 50;
  if (priceGapKrw >= 100) repScore += 28;
  else if (priceGapKrw >= 0) repScore += 18;
  else if (priceGapKrw > -500) repScore += 5;
  else repScore -= 15;

  if (input.freeShippingRecommended || ship === 0) repScore += 12;
  if ((input.dispatchWithinDays ?? 3) <= 1) repScore += 10;
  else if ((input.dispatchWithinDays ?? 3) <= 2) repScore += 5;

  repScore += Math.min(input.reviewCount / 500, 1) * 8;
  repScore -= Math.min(input.competitionIntensity * 6, 18);

  repScore = Math.min(99, Math.max(0, Math.round(repScore)));

  const catalogSellers = Math.max(2, Math.min(input.productCount, 50));
  let catalogMatchRisk: CatalogWinAnalysis["catalogMatchRisk"] = "medium";
  if (input.competitionIntensity > 1.8 || catalogSellers > 25) catalogMatchRisk = "high";
  else if (input.competitionIntensity < 0.9 || catalogSellers < 8) catalogMatchRisk = "low";

  const winStrategy: string[] = [];
  if (priceGapKrw < 0) {
    winStrategy.push(
      `총액(상품+배송) ${Math.abs(priceGapKrw).toLocaleString()}원 추가 인하 → 대표 아이템 후보`,
    );
  } else {
    winStrategy.push(`총액 ${priceGapKrw.toLocaleString()}원 유리 — 대표 아이템 유지 전략`);
  }
  if (!input.freeShippingRecommended) {
    winStrategy.push("무료배송 전환 검토 (대표 아이템 가중치 큼)");
  }
  winStrategy.push("오늘출발 설정 + 3영업일 출고 SLA 준수 (페널티 방지)");
  if (catalogMatchRisk === "high") {
    winStrategy.push("카탈로그 과밀 — 구성·용량·세트 차별화로 **별도 카탈로그** 노리기");
  } else {
    winStrategy.push("브랜드·모델·용량 정확 기재 → AI 카탈로그 오매칭 방지");
  }
  winStrategy.push("검색 태그 10개 · 셀러 부담 쿠폰 1개 전략적 운용");

  const policyFlags: PolicyFlag[] = [
    {
      level: repScore >= 60 ? "info" : "warn",
      code: "REP_ITEM",
      message:
        repScore >= 70
          ? "대표 아이템(토스 Item Winner) 선정 가능성 높음"
          : repScore >= 50
            ? "대표 아이템 경쟁 구간 — 가격·배송 최적화 필요"
            : "비대표 노출 가능성 — '다른 가격' 탭에 묶일 수 있음",
    },
  ];

  const marginPctSafe = Math.max(0, Math.min(80, input.marginPct ?? 12));
  const complianceScore = Math.min(
    99,
    Math.round(70 + (repScore >= 55 ? 15 : 0) + (marginPctSafe >= 12 ? 10 : 0)),
  );

  const policyBrief =
    repScore >= 65
      ? `카탈로그 ${catalogSellers}개 셀러 추정 · 총액 ${ourTotal.toLocaleString()}원 vs 최저 ${bestCompetitorTotal.toLocaleString()}원 · **대표 아이템 점수 ${repScore}** — 토스 정책상 Buy Box 유리`
      : `카탈로그 경쟁 ${catalogMatchRisk === "high" ? "치열" : "보통"} · 대표 아이템 ${repScore}점 — 가격·무료배송·출고속도 개선 후 재등록`;

  return {
    representativeItemScore: repScore,
    catalogMatchRisk,
    estimatedCatalogSellers: catalogSellers,
    ourTotalPriceKrw: ourTotal,
    bestCompetitorTotalKrw: bestCompetitorTotal,
    priceGapKrw,
    winStrategy,
    policyFlags,
    complianceScore,
    policyBrief,
  };
}

export function buildPolicyChecklist(category: TossShopCategory): string[] {
  const cat = CATEGORY_POLICY[category];
  return [
    "브랜드·모델·용량·구성 정확 입력 (카탈로그 오매칭 방지)",
    "검색 태그 10개: " + cat.tags.join(", "),
    cat.certNote,
    cat.dispatchTip,
    "결제 후 3영업일 내 출고 · 구매확정 +7일",
    "가격관리 메뉴에서 최적가 매칭 여부 확인",
  ];
}

export function computeV6MasterScore(input: {
  geniusScore: number;
  representativeItemScore: number;
  complianceScore: number;
  monthlyProfitKrw: number;
  goalKrw: number;
}): number {
  const profitShare = Math.min(input.monthlyProfitKrw / input.goalKrw, 0.2) * 100;
  return Math.min(
    99,
    Math.round(
      input.geniusScore * 0.35 +
        input.representativeItemScore * 0.35 +
        input.complianceScore * 0.15 +
        profitShare * 0.15,
    ),
  );
}

export function buildFullMarketScanSummary(input: {
  catalogSize: number;
  keyword: string;
  competitorCount: number;
  priceLow: number;
  priceMedian: number;
  priceHigh: number;
  searchVolume: number;
}): string {
  return [
    `시장 전체 스캔: 카탈로그 ${input.catalogSize}개 상품 · 「${input.keyword}」 경쟁사 ${input.competitorCount}곳`,
    `가격대 ${input.priceLow.toLocaleString()}~${input.priceHigh.toLocaleString()}원 (중위 ${input.priceMedian.toLocaleString()}원)`,
    `월 검색 ${input.searchVolume.toLocaleString()} · 토스 AI 카탈로그 매칭·대표 아이템 기준으로 최적 포지션 산출`,
  ].join(" · ");
}

export function buildV6PickEnrichment(input: {
  keyword: string;
  productName: string;
  suggestedTitle: string;
  category: TossShopCategory;
  priceKrw: number;
  marginPct: number;
  competitorPrices: number[];
  competitionIntensity: number;
  productCount: number;
  reviewCount: number;
  catalogSize: number;
  searchVolume: number;
  priceLow: number;
  priceMedian: number;
  priceHigh: number;
  geniusScore: number;
  monthlyProfitKrw: number;
  goalKrw: number;
  freeShippingRecommended?: boolean;
  shippingFeeKrw?: number;
}) {
  const extraFlags = scanPolicyFlags({
    keyword: input.keyword,
    productName: input.productName,
    category: input.category,
    marginPct: input.marginPct,
    suggestedTitle: input.suggestedTitle,
  });

  const catalogWin = scoreRepresentativeItemWin({
    priceKrw: input.priceKrw,
    shippingFeeKrw: input.shippingFeeKrw ?? 2500,
    competitorPrices: input.competitorPrices.length ? input.competitorPrices : [input.priceMedian],
    freeShippingRecommended: input.freeShippingRecommended ?? input.priceKrw >= 15000,
    reviewCount: input.reviewCount,
    competitionIntensity: input.competitionIntensity,
    productCount: input.productCount,
    marginPct: input.marginPct,
  });

  catalogWin.policyFlags = [...catalogWin.policyFlags, ...extraFlags];

  const policyChecklist = buildPolicyChecklist(input.category);
  const marketScanSummary = buildFullMarketScanSummary({
    catalogSize: input.catalogSize,
    keyword: input.keyword,
    competitorCount: input.productCount,
    priceLow: input.priceLow,
    priceMedian: input.priceMedian,
    priceHigh: input.priceHigh,
    searchVolume: input.searchVolume,
  });

  const v6MasterScore = computeV6MasterScore({
    geniusScore: input.geniusScore,
    representativeItemScore: catalogWin.representativeItemScore,
    complianceScore: catalogWin.complianceScore,
    monthlyProfitKrw: input.monthlyProfitKrw,
    goalKrw: input.goalKrw,
  });

  return {
    catalogWin,
    policyChecklist,
    marketScanSummary,
    v6MasterScore,
  };
}
