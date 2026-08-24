/**
 * 토스쇼핑 공식 정책 엔진 — 수익과 직결되는 규칙을 코드화
 *
 * 출처: shopping-docs.toss.im 공식 문서 (2026-08 기준). 추측이 아니라 명문 규칙만 넣었다.
 *  · 카탈로그 운영 가이드  /shopping-operations/catalog/guide
 *  · 배송 품질 우수 인센티브 /penalty/incentive/delivery-incentive
 *  · 셀러 페널티            /penalty/penalty/seller-penalty
 *  · 상품 등록하기          /products/add
 *  · 광고 운영하기          /ads/setup/tips
 *
 * ★ 이 엔진이 존재하는 이유 — 토스쇼핑의 수익 구조는 스마트스토어와 근본적으로 다르다:
 *
 * 1) 수수료 0%가 실재한다 (배송 품질 우수 인센티브)
 *    4조건을 모두 충족하면 그 **옵션**의 상품판매수수료율이 0%가 된다.
 *    판매가의 8%가 통째로 순익이 되므로, 단일 요인 중 마진 영향이 가장 크다.
 *
 * 2) 카탈로그 대표 아이템을 못 따면 사실상 노출이 0이다
 *    동일 상품은 하나의 카탈로그로 묶이고, 대표 아이템의 정보만 대표 노출된다.
 *    게다가 광고조차 '대표 노출 미선정' 상태면 `노출 제한`이 걸린다.
 *    → 위탁판매로 남과 똑같은 도매 상품을 그대로 올리면 최저가 싸움에서 지는 순간 죽는다.
 *
 * 3) 상품명 규칙이 스마트스토어와 반대다
 *    토스는 "수량·색상·맛 등은 검색 키워드 영역에 등록"하라고 명시한다.
 *    상품명에 키워드를 몰아넣는 스마트스토어식 최적화는 토스에서 역효과다.
 */

export const TOSS_POLICY_VERSION = "1.0";

/** 토스 상품판매수수료(카테고리별 상이) 기본 추정치 */
export const TOSS_DEFAULT_SALES_FEE_RATE = 0.08;
/** 결제 수수료 — 인센티브로 0%가 되어도 이건 남는다 */
export const TOSS_PAYMENT_FEE_RATE = 0.025;

// ─────────────────────────────────────────────────────────────
// 1. 배송 품질 우수 인센티브 (상품판매수수료 0%)
// ─────────────────────────────────────────────────────────────

export type ShippingIncentiveState = {
  /** 셀러 페널티 점수 (30일 합산) */
  penaltyPoints: number;
  /** 상품에 '오늘 출발'이 적용되어 있는가 (상품 단위 설정) */
  todayDispatchEnabled: boolean;
  /** 직전 7영업일 내 발송 이력 건수 */
  shipmentsLast7BizDays: number;
  /** 직전 7영업일 발송기한 준수율 (0–100). 발송지연 처리분은 미준수로 계산해야 함 */
  onTimeRatePct: number;
};

export type ShippingIncentiveVerdict = {
  eligible: boolean;
  /** 인센티브 적용 시 상품판매수수료율 */
  salesFeeRate: number;
  failed: string[];
  actions: string[];
  note: string;
};

/**
 * 4조건 전부 충족해야 한다(공식). 하나라도 빠지면 대상 제외.
 * 조건 충족일의 **다음 날 01:00**부터 적용되고, 매일 재판정된다.
 */
export function evaluateShippingIncentive(s: ShippingIncentiveState): ShippingIncentiveVerdict {
  const failed: string[] = [];
  const actions: string[] = [];

  if (s.penaltyPoints > 0) {
    failed.push(`셀러 페널티 ${s.penaltyPoints}점 (0점이어야 함)`);
    actions.push("페널티 항목 소명·해소 — 페널티가 있으면 수수료 0% 자격이 사라진다");
  }
  if (!s.todayDispatchEnabled) {
    failed.push("'오늘 출발' 미적용");
    actions.push("상품 배송정보에서 '오늘 출발' 설정 (옵션이 아니라 상품 단위)");
  }
  if (s.shipmentsLast7BizDays < 1) {
    failed.push("직전 7영업일 발송 이력 0건");
    actions.push("발송 이력 1건만 있어도 대상 — 신규 상품도 첫 발송 후 다음 날 적용 가능");
  }
  if (s.onTimeRatePct < 100) {
    failed.push(`발송기한 준수율 ${s.onTimeRatePct}% (100%여야 함)`);
    actions.push("발송지연 처리는 기한 내 발송해도 '미준수'로 간주 — 지연처리 대신 당일 발송");
  }

  const eligible = failed.length === 0;
  return {
    eligible,
    salesFeeRate: eligible ? 0 : TOSS_DEFAULT_SALES_FEE_RATE,
    failed,
    actions,
    note: eligible
      ? "배송 인센티브 적용 — 상품판매수수료 0% (매일 01:00 재판정, 조건 유지 시 자동 연장)"
      : `수수료 0% 미적용 — ${failed[0]}`,
  };
}

/** 인센티브 반영 실수령 수수료 */
export function tossFees(priceKrw: number, incentiveActive: boolean): number {
  const salesRate = incentiveActive ? 0 : TOSS_DEFAULT_SALES_FEE_RATE;
  return Math.round(priceKrw * (salesRate + TOSS_PAYMENT_FEE_RATE));
}

/** 인센티브가 단위 순익을 얼마나 올리는가 — 소싱 판단에 직접 쓰인다 */
export function incentiveProfitUplift(priceKrw: number): number {
  return Math.round(priceKrw * TOSS_DEFAULT_SALES_FEE_RATE);
}

// ─────────────────────────────────────────────────────────────
// 2. 카탈로그 대표 아이템 (Buy Box) 전략
// ─────────────────────────────────────────────────────────────

export type CatalogPosition = {
  /** 동일 카탈로그에 묶일 가능성이 높은가 (남들과 같은 도매 상품 그대로) */
  likelyMerged: boolean;
  /** 내 배송비 포함 총 가격 */
  myTotalKrw: number;
  /** 카탈로그 내 최저 총 가격 */
  bestTotalKrw: number;
  inStock: boolean;
  freeShipping: boolean;
};

export type CatalogVerdict = {
  /** 대표 아이템을 딸 가능성 */
  canWinRepresentative: boolean;
  /** 노출이 사실상 막히는 상태인가 (대표 미선정 = 광고도 노출 제한) */
  exposureBlocked: boolean;
  strategy: "win_price" | "differentiate" | "safe_standalone";
  gapKrw: number;
  actions: string[];
  note: string;
};

/**
 * 공식 대표 아이템 선정 기준:
 *  · 품절 상품은 대표로 선정되지 않는다
 *  · 배송비 포함 총 가격이 가장 합리적인 상품이 우선
 *  · 총 가격이 같으면 배송조건(무료배송 등)과 판매 안정성 고려
 * 그리고 광고 문서상 '대표 노출 미선정'이면 광고도 `노출 제한` 상태가 된다.
 */
export function evaluateCatalogPosition(p: CatalogPosition): CatalogVerdict {
  const actions: string[] = [];

  if (!p.likelyMerged) {
    return {
      canWinRepresentative: true,
      exposureBlocked: false,
      strategy: "safe_standalone",
      gapKrw: 0,
      actions: ["단독 카탈로그 — 최저가 경쟁 없이 노출 확보. 구성·용량 차별화를 유지할 것"],
      note: "별도 카탈로그로 분리될 가능성이 높아 대표 아이템 경쟁을 피한다",
    };
  }

  const gap = p.myTotalKrw - p.bestTotalKrw;

  if (!p.inStock) {
    return {
      canWinRepresentative: false,
      exposureBlocked: true,
      strategy: "differentiate",
      gapKrw: gap,
      actions: ["품절 해제 — 품절 상품은 대표 아이템에서 자동 제외된다"],
      note: "품절 상태 — 대표 아이템 선정 대상이 아니다",
    };
  }

  if (gap <= 0) {
    return {
      canWinRepresentative: true,
      exposureBlocked: false,
      strategy: "win_price",
      gapKrw: gap,
      actions: [
        p.freeShipping
          ? "총가격 최저 + 무료배송 — 대표 아이템 우위 유지"
          : "무료배송 전환 검토 — 총가격 동일 시 배송조건이 가른다",
        "품절 방지: 공급처 재고 모니터링 (품절 즉시 대표 자격 상실)",
      ],
      note: "배송비 포함 총가격 우위 — 대표 아이템 가능",
    };
  }

  // 총가격이 밀리는 경우: 가격을 더 깎는 건 마진을 죽인다.
  // 공식 매칭 로직상 "모델명·용량·구성 중 하나라도 다르면 별도 카탈로그"이므로
  // 구성 차별화가 최저가 경쟁보다 수익성 있는 탈출구다.
  actions.push(
    `총가격 ${gap.toLocaleString()}원 열세 — 대표 아이템 불가 상태`,
    "구성 차별화로 별도 카탈로그 생성: 수량 묶음(2입·3입), 용량 변경, 사은품 구성",
    "공식 매칭 로직상 모델명·용량·구성 중 하나만 달라도 별도 카탈로그로 분리된다",
    "가격을 더 내려 대표를 뺏는 건 마진이 남을 때만 — 광고도 대표 미선정이면 '노출 제한'",
  );

  return {
    canWinRepresentative: false,
    exposureBlocked: true,
    strategy: "differentiate",
    gapKrw: gap,
    actions,
    note: `대표 미선정 — 자연노출·광고 모두 제한. 구성 차별화 필요 (총가격 ${gap.toLocaleString()}원 열세)`,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. 셀러 페널티 리스크
// ─────────────────────────────────────────────────────────────

/** 30일 합산 10점이면 이용 정지, 정지 이력 1회 + 10점이면 영구 퇴점 */
export const PENALTY_SUSPEND_THRESHOLD = 10;

export type PenaltyRisk = {
  level: "safe" | "warn" | "critical";
  points: number;
  remainingToSuspend: number;
  /** 페널티가 있으면 수수료 0% 인센티브 자격도 함께 사라진다 */
  losesIncentive: boolean;
  note: string;
};

export function assessPenaltyRisk(points: number, priorSuspensions = 0): PenaltyRisk {
  const remaining = Math.max(0, PENALTY_SUSPEND_THRESHOLD - points);
  const level: PenaltyRisk["level"] =
    points >= PENALTY_SUSPEND_THRESHOLD ? "critical" : points >= 5 ? "warn" : "safe";
  return {
    level,
    points,
    remainingToSuspend: remaining,
    losesIncentive: points > 0,
    note:
      points >= PENALTY_SUSPEND_THRESHOLD
        ? priorSuspensions >= 1
          ? "30일 합산 10점 + 정지 이력 — 영구 정지·퇴점 대상"
          : "30일 합산 10점 — 토스쇼핑 이용 정지 대상"
        : points > 0
          ? `페널티 ${points}점 — 정지까지 ${remaining}점. 페널티가 있는 동안 수수료 0% 인센티브 제외`
          : "페널티 0점 — 수수료 0% 인센티브 자격 유지",
  };
}

// ─────────────────────────────────────────────────────────────
// 4. 상품 등록 규칙 검증 (토스 공식)
// ─────────────────────────────────────────────────────────────

/** 비법정 계량단위 — 공식 문서상 사용 불가 */
const ILLEGAL_UNITS = ["돈", "관", "파운드", "온스", "근", "되", "말"];

export type ListingComplianceIssue = {
  field: "name" | "keywords" | "option" | "category";
  severity: "block" | "warn";
  message: string;
  fix: string;
};

/**
 * 토스 공식 상품 등록 규칙 검증.
 * 핵심: 수량·색상·맛은 상품명이 아니라 **검색 키워드 영역**에 넣어야 한다.
 */
export function checkListingCompliance(input: {
  name: string;
  searchKeywords: string[];
  optionUnitText?: string;
}): ListingComplianceIssue[] {
  const issues: ListingComplianceIssue[] = [];

  // 비법정 계량단위
  for (const u of ILLEGAL_UNITS) {
    const re = new RegExp(`\\d\\s*${u}(?![가-힣])`);
    if (re.test(input.name) || (input.optionUnitText && re.test(input.optionUnitText))) {
      issues.push({
        field: "option",
        severity: "block",
        message: `비법정 계량단위 '${u}' 사용 — 토스는 L·ml·g·kg 등 법정계량단위만 허용`,
        fix: `'${u}'를 g/kg/ml/L로 환산해 표기`,
      });
    }
  }

  // 수량·색상·맛은 상품명이 아니라 검색 키워드로 (공식 가이드)
  const inNameOnly: string[] = [];
  const qtyLike = input.name.match(/\d+\s*(개입|입|팩|세트|매|박스)/g) ?? [];
  if (qtyLike.length) inNameOnly.push(...qtyLike);
  const colorLike = input.name.match(/(블랙|화이트|레드|블루|그린|핑크|베이지|네이비)/g) ?? [];
  if (colorLike.length) inNameOnly.push(...colorLike);

  if (inNameOnly.length) {
    issues.push({
      field: "name",
      severity: "warn",
      message: `상품명에 수량·색상 표기 (${inNameOnly.slice(0, 3).join(", ")}) — 토스는 검색 키워드 영역 등록을 권장`,
      fix: "수량·색상·맛은 상품명에서 빼고 검색 키워드에 등록 (토스가 상품명을 자동 최적화해 노출)",
    });
  }

  if (input.searchKeywords.length < 5) {
    issues.push({
      field: "keywords",
      severity: "warn",
      message: `검색 키워드 ${input.searchKeywords.length}개 — 수량·색상·맛까지 담기엔 부족`,
      fix: "상품명에서 뺀 속성을 검색 키워드로 옮겨 8–10개 확보",
    });
  }

  return issues;
}
