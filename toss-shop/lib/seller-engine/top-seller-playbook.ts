/**
 * Jarvis Top-Seller Playbook — 검증된 상위 셀러 전술만 반영
 *
 * YouTube·커뮤니티·블로그 주장 중 **공식 문서·복수 출처로 확인된 것**만 포함.
 * 마케팅 과장(“CTR 2배 보장”, “3개월 235%”)은 제외.
 *
 * Sources (verified):
 * - shopping-docs.toss.im — 카탈로그·대표아이템 (배송비 포함 총액)
 * - service.toss.im/terms/4358 — 카탈로그 방식 약관
 * - sweepingoms.com — 도매매 MOQ 없음·위탁 적합
 * - windly.cc / i-boss — 필터링·차별화 (교차 확인된 운영 원칙)
 * - allra.co.kr — 토스 공구 가격대·노출 구조 (커뮤니티 교차)
 */

import type { TossShopCategory } from "../types";

export const TOP_SELLER_PLAYBOOK_VERSION = "1.0";

export type VerifiedTacticSource = {
  label: string;
  url: string;
};

export type VerifiedTacticDef = {
  id: string;
  category: "sourcing" | "listing" | "pricing" | "catalog" | "ops" | "toss";
  title: string;
  principle: string;
  sources: VerifiedTacticSource[];
  modes: ("consignment" | "import")[];
};

/** 검증된 전술 정의 (정적 KB) */
export const VERIFIED_TOP_SELLER_TACTICS: VerifiedTacticDef[] = [
  {
    id: "domeme_unit",
    category: "sourcing",
    title: "도매매 단품(MOQ≤1) 발주",
    principle: "도매매는 최소 주문 없이 1개 단위 위탁 발주 가능 — 도매꾹 대량 MOQ 회피",
    sources: [
      { label: "스윕 — 도매꾹 vs 도매매", url: "https://sweepingoms.com/blog/domeggook-vs-domeme-strategy-guide" },
    ],
    modes: ["consignment"],
  },
  {
    id: "filter_not_mass",
    category: "sourcing",
    title: "무차별 대량등록 회피",
    principle: "인기 Top100 복사는 가격전쟁·죽은 SKU 누적 — 틈새 키워드·필터 선별",
    sources: [
      { label: "윈들리 — 도매매 필터링", url: "https://www.windly.cc/blog/domaemae-sourcing-filtering-3" },
    ],
    modes: ["consignment", "import"],
  },
  {
    id: "toss_rep_total_price",
    category: "catalog",
    title: "토스 대표아이템 = 배송비 포함 총액",
    principle: "동일 카탈로그에서 배송비 포함 총액 최저가가 대표 노출 — 무료배송·총액 최적화",
    sources: [
      { label: "토스쇼핑 카탈로그 가이드", url: "https://shopping-docs.toss.im/shopping-operations/catalog/guide" },
      { label: "토스 파트너 약관", url: "https://service.toss.im/terms/4358" },
    ],
    modes: ["consignment", "import"],
  },
  {
    id: "catalog_differentiation",
    category: "catalog",
    title: "카탈로그 회피 = 구성·용량·모델 차별",
    principle: "브랜드·구성·용량·모델 중 하나라도 다르면 별도 카탈로그 — 오매칭 페널티 주의",
    sources: [
      { label: "토스쇼핑 카탈로그 가이드", url: "https://shopping-docs.toss.im/shopping-operations/catalog/guide" },
    ],
    modes: ["consignment", "import"],
  },
  {
    id: "title_thumb_diff",
    category: "listing",
    title: "상품명·썸네일 차별화",
    principle: "공급사 원본 그대로 등록 시 동일 SKU 경쟁 — 소비자 검색 키워드·서브컷 썸네일 가공",
    sources: [
      { label: "윈들리 — 가공 전략", url: "https://www.windly.cc/blog/domaemae-sourcing-filtering-3" },
    ],
    modes: ["consignment", "import"],
  },
  {
    id: "long_tail_keyword",
    category: "listing",
    title: "롱테일·사용맥락 키워드",
    principle: "대형 카테고리보다 ‘특정 용도+타깃’ 조합 — 검색량 대비 경쟁 낮은 틈새",
    sources: [
      { label: "아이보스 — 키워드 조합", url: "https://www.i-boss.co.kr/ab-6141-71376" },
    ],
    modes: ["consignment", "import"],
  },
  {
    id: "margin_floor",
    category: "pricing",
    title: "순마진 18%+ (지속 가능)",
    principle: "수수료·배송·반품 버퍼 포함 시 18% 이상이 상위 셀러 공통 하한",
    sources: [
      { label: "쿠팡 셀러 — 순이익 20% 검증", url: "https://blog.naver.com/mailer-/224293148222" },
    ],
    modes: ["consignment", "import"],
  },
  {
    id: "toss_price_band",
    category: "toss",
    title: "토스 가격대 5천~5만 원 + 5~15% 할인",
    principle: "토스 공구는 비구매 목적 트래픽도 노출 — 저가·할인 경쟁력이 전환에 유리",
    sources: [
      { label: "올라 — 토스 공구 노출", url: "https://allra.co.kr/blogs/118" },
    ],
    modes: ["consignment", "import"],
  },
  {
    id: "lean_sample",
    category: "ops",
    title: "소량 검증 → 확대(린)",
    principle: "키워드·마진 검증 후 소량 등록·판매 확인 → 효자 SKU에 재고·시간 집중",
    sources: [
      { label: "쿠팡 로켓그로스 실전", url: "https://blog.naver.com/mailer-/224293148222" },
    ],
    modes: ["consignment", "import"],
  },
  {
    id: "stock_penalty",
    category: "ops",
    title: "품절·지연배송 제로",
    principle: "공급사 품절·발주 지연은 강제취소·페널티 — 재고 연동·신뢰 공급처",
    sources: [
      { label: "윈들리 FAQ — 품절 주의", url: "https://www.windly.cc/blog/domaemae-sourcing-filtering-3" },
    ],
    modes: ["consignment"],
  },
  {
    id: "pareto_80",
    category: "ops",
    title: "파레토 80% — Top SKU 집중",
    principle: "매출 80%는 20% SKU에서 — 인증 SKU에 시간·광고·재고 80% 배분",
    sources: [{ label: "Jarvis goal-engine", url: "https://effiroad.com" }],
    modes: ["consignment", "import"],
  },
  {
    id: "review_gap",
    category: "sourcing",
    title: "경쟁 리뷰 공백 공략",
    principle: "상위 SKU 리뷰·평점 분석 → 불만 보완 포인트를 상세·옵션에 반영",
    sources: [
      { label: "쿠파일럿 — 리뷰 소구점", url: "https://coupilot.inblog.io/%EC%BF%A0%ED%8C%A1-%ED%82%A4%EC%9B%8C%EB%93%9C-%EB%B0%9C%EA%B5%B4-34840" },
    ],
    modes: ["consignment", "import"],
  },
];

export type AppliedTactic = {
  id: string;
  title: string;
  applied: boolean;
  action: string;
  source: string;
};

export type TopSellerPlaybookReport = {
  engineVersion: string;
  alignmentScore: number;
  verifiedTacticCount: number;
  appliedCount: number;
  tactics: AppliedTactic[];
  jarvisActions: string[];
  brief: string;
};

function keywordIsLongTail(keyword: string): boolean {
  const parts = keyword.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 || keyword.length >= 6;
}

function inTossPriceBand(priceKrw: number): boolean {
  return priceKrw >= 5_000 && priceKrw <= 50_000;
}

export function buildTopSellerPlaybook(input: {
  mode: "consignment" | "import";
  keyword: string;
  category: TossShopCategory;
  priceKrw: number;
  marginPct: number;
  moq: number;
  wholesalePlatform?: "domeggook" | "domeme";
  wholesaleLive: boolean;
  catalogStrategyMode?: "win_representative" | "avoid_catalog";
  representativeItemScore?: number;
  isolationScore?: number;
  searchVolume: number;
  competitionIntensity: number;
  avgReviewCount?: number;
  monthlyProfitKrw: number;
  hasDifferentiatedTitle: boolean;
  freeShippingRecommended: boolean;
}): TopSellerPlaybookReport {
  const applicable = VERIFIED_TOP_SELLER_TACTICS.filter((t) => t.modes.includes(input.mode));
  const tactics: AppliedTactic[] = [];
  const jarvisActions: string[] = [];
  let score = 0;
  let maxScore = 0;

  const add = (id: string, title: string, applied: boolean, action: string, weight: number, source: string) => {
    maxScore += weight;
    if (applied) score += weight;
    else jarvisActions.push(action);
    tactics.push({ id, title, applied, action, source });
  };

  if (input.mode === "consignment") {
    add(
      "domeme_unit",
      "도매매 단품(MOQ≤1)",
      input.moq <= 1 && (input.wholesalePlatform === "domeme" || !input.wholesaleLive),
      "도매매(supply)에서 MOQ≤1 공급처 재검색",
      14,
      "sweepingoms.com",
    );
    add(
      "stock_penalty",
      "품절·지연배송 방지",
      input.wholesaleLive,
      "실시간 재고 API 연동 또는 품절 빠른 공급처로 교체",
      8,
      "windly.cc",
    );
  }

  add(
    "filter_not_mass",
    "틈새 선별 (대량등록 회피)",
    input.competitionIntensity < 2.0 && keywordIsLongTail(input.keyword),
    "경쟁 낮은 롱테일 키워드로 재소싱 — Top100 복사 금지",
    10,
    "windly.cc",
  );

  const catalogOk =
    input.catalogStrategyMode === "avoid_catalog"
      ? (input.isolationScore ?? 0) >= 55
      : (input.representativeItemScore ?? 0) >= 58;
  add(
    "toss_rep_total_price",
    "대표아이템 총액(배송포함) 최적",
    catalogOk && input.freeShippingRecommended,
    "배송비 포함 총액 최저 + 무료배송 옵션 검토",
    14,
    "shopping-docs.toss.im",
  );

  add(
    "catalog_differentiation",
    "카탈로그 차별(구성·용량)",
    input.catalogStrategyMode === "avoid_catalog" && (input.isolationScore ?? 0) >= 55,
    input.catalogStrategyMode === "win_representative"
      ? "대표아이템 승리 전략 유지 — 총액·출고 속도"
      : "구성·옵션·세트명 차별로 별도 카탈로그 확보",
    10,
    "shopping-docs.toss.im",
  );

  add(
    "title_thumb_diff",
    "상품명·썸네일 차별화",
    input.hasDifferentiatedTitle,
    "공급사 원본명 변경 + 서브컷 썸네일·셀링포인트 상단 배치",
    10,
    "windly.cc",
  );

  add(
    "long_tail_keyword",
    "롱테일 키워드",
    keywordIsLongTail(input.keyword),
    "네이버 데이터랩/토스 검색어로 사용맥락 키워드 2~4개 조합",
    8,
    "i-boss.co.kr",
  );

  add(
    "margin_floor",
    "순마진 18%+",
    input.marginPct >= 18,
    `현재 ${input.marginPct}% — 가격·공급가 재조정으로 18% 이상`,
    12,
    "naver blog",
  );

  add(
    "toss_price_band",
    "토스 가격대·할인",
    inTossPriceBand(input.priceKrw),
    input.priceKrw < 5_000
      ? "5,000원 이상 권장 가격대로 조정"
      : input.priceKrw > 50_000
        ? "5만 원 이하 진입 SKU 병행 검토"
        : "5~15% 할인율·무료배송 조합 검토",
    8,
    "allra.co.kr",
  );

  add(
    "lean_sample",
    "소량 검증 → 확대",
    input.monthlyProfitKrw >= 300_000,
    "1 SKU 소량 등록 → 2주 판매 확인 후 확대",
    8,
    "naver blog",
  );

  add(
    "pareto_80",
    "Top SKU 80% 집중",
    input.monthlyProfitKrw >= 500_000,
    "월 50만+ 기여 SKU에 광고·CS·재고 집중",
    8,
    "Jarvis",
  );

  const lowReviews = (input.avgReviewCount ?? 100) < 80;
  add(
    "review_gap",
    "경쟁 리뷰 공백",
    lowReviews && input.competitionIntensity < 1.8,
    "상위 3개 경쟁사 리뷰 1~3점 불만 → 상세페이지 보완",
    6,
    "coupilot.inblog.io",
  );

  const alignmentScore = maxScore > 0 ? Math.min(99, Math.round((score / maxScore) * 100)) : 0;
  const appliedCount = tactics.filter((t) => t.applied).length;

  const brief =
    alignmentScore >= 85
      ? `상위 셀러 전술 ${appliedCount}/${applicable.length} 적용 · Jarvis 정렬 ${alignmentScore}%`
      : alignmentScore >= 70
        ? `전술 ${appliedCount}/${applicable.length} — ${jarvisActions.slice(0, 2).join(" · ")}`
        : `전술 정렬 ${alignmentScore}% — ${jarvisActions.slice(0, 3).join(" → ")}`;

  return {
    engineVersion: TOP_SELLER_PLAYBOOK_VERSION,
    alignmentScore,
    verifiedTacticCount: applicable.length,
    appliedCount,
    tactics,
    jarvisActions: jarvisActions.slice(0, 6),
    brief,
  };
}
