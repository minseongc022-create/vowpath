/**
 * AI v6.2 — 토스쇼핑 마켓플레이스 종합 리스크 플레이북
 *
 * 카탈로그/Item Winner 외 페널티·배송·금지품목·가격·CS·반품·인증·수입 등
 * 토스 공식 정책 기반 사전 탐지 + 완화 액션.
 *
 * Ref: shopping-docs.toss.im/penalty/penalty/seller-penalty
 *      shopping-docs.toss.im/shopping-operations/support/policy
 */

import type {
  CatalogStrategyPlan,
  CatalogWinAnalysis,
  MarketplaceRisk,
  PenaltyTierBrief,
  RiskPlaybookReport,
  TossShopCategory,
} from "../types";

export const RISK_PLAYBOOK_VERSION = "v6.3";

/** 토스셀러 페널티: 30일 합산 10점 → 이용정지, 2회째 10점 → 영구정지 */
export const TOSS_PENALTY_TIER: PenaltyTierBrief = {
  windowDays: 30,
  suspendThreshold: 10,
  permanentAfterSuspensions: 1,
  topViolations: [
    { label: "발송 기한 미준수 (아이템 미노출 +1점)", points: 1 },
    { label: "장기 미발송 14일+", points: 10 },
    { label: "가송장/허위 송장", points: 3 },
    { label: "허위거래·셀프구매", points: 10 },
    { label: "직거래 유도", points: 5 },
    { label: "중복 등록", points: 4 },
    { label: "판매 불가 상품", points: 5 },
    { label: "KC·인증 미구비", points: 5 },
    { label: "CS 미응대 1영업일+", points: 4 },
    { label: "고시 정보 누락/오기재", points: 2 },
  ],
};

const PROHIBITED_KEYWORDS: { word: string; points: number; label: string }[] = [
  { word: "담배", points: 5, label: "판매 불가" },
  { word: "주류", points: 5, label: "판매 불가(전통주 제외)" },
  { word: "마약", points: 10, label: "마약류" },
  { word: "총기", points: 5, label: "판매 불가" },
  { word: "도박", points: 5, label: "사행성" },
  { word: "성인용품", points: 5, label: "제한 품목" },
  { word: "의약품", points: 5, label: "의약품 판매 금지" },
  { word: "불법", points: 5, label: "불법" },
  { word: "가품", points: 3, label: "위조상품" },
  { word: "짝퉁", points: 3, label: "위조상품" },
  { word: "레플리카", points: 3, label: "지재권" },
];

const DIRECT_TRADE_PATTERNS = [
  "카톡",
  "카카오톡",
  "계좌이체",
  "직거래",
  "외부몰",
  "010-",
  "문의주세요",
  "dm ",
  "디엠",
];

const HEALTH_CLAIM_PATTERNS = ["치료", "완치", "암", "당뇨", "고혈압", "의약", "처방"];

const CATEGORY_DISCLOSURE: Record<TossShopCategory, string[]> = {
  food: ["식품유형", "원산지", "소비기한", "내용량", "알레르기", "영양성분"],
  beauty: ["용량", "전성분", "사용기한", "제조국", "화장품 책임판매업"],
  home: ["재질", "크기", "KC(전기)", "제조국", "AS"],
  digital: ["모델명", "KC", "정품/병행", "보증", "호환"],
  fashion: ["섬유 MIX", "색상", "사이즈", "제조국", "세탁"],
  health: ["기능성 표시", "GMP", "섭취량", "유통기한", "원료"],
};

const CATEGORY_CERT: Record<TossShopCategory, { required: string; penaltyPoints: number }> = {
  food: { required: "식품위생·원산지·소비기한 표시", penaltyPoints: 5 },
  beauty: { required: "화장품 책임판매업·KC(해당 시)", penaltyPoints: 5 },
  home: { required: "전기용품 KC · 어린이제품 안전", penaltyPoints: 5 },
  digital: { required: "전파법 KC · 정품 보증", penaltyPoints: 5 },
  fashion: { required: "섬유 MIX · KC(아동)", penaltyPoints: 2 },
  health: { required: "건강기능식품 GMP·표시광고 준수", penaltyPoints: 5 },
};

export type RiskScanInput = {
  keyword: string;
  productName: string;
  suggestedTitle: string;
  category: TossShopCategory;
  marginPct: number;
  priceKrw: number;
  mode: "consignment" | "import";
  catalogStrategy?: CatalogStrategyPlan;
  catalogWin?: CatalogWinAnalysis;
  competitionIntensity: number;
  sourceCountry?: string;
};

function pushRisk(risks: MarketplaceRisk[], risk: MarketplaceRisk) {
  if (!risks.some((r) => r.code === risk.code)) risks.push(risk);
}

function scanProhibited(text: string, risks: MarketplaceRisk[]) {
  const lower = text.toLowerCase();
  for (const p of PROHIBITED_KEYWORDS) {
    if (lower.includes(p.word)) {
      pushRisk(risks, {
        category: "prohibited",
        level: p.points >= 10 ? "critical" : "block",
        code: `PROHIB_${p.word}`,
        title: "판매 불가·제한 품목",
        message: `「${p.word}」 — ${p.label} · 즉시 미노출`,
        penaltyPoints: p.points,
        mitigation: ["해당 키워드/상품 등록 금지", "유사 표현(줄임·영문)도 검수 탈락"],
      });
    }
  }
}

function scanDirectTrade(text: string, risks: MarketplaceRisk[]) {
  for (const pat of DIRECT_TRADE_PATTERNS) {
    if (text.includes(pat)) {
      pushRisk(risks, {
        category: "commercial",
        level: "critical",
        code: "DIRECT_TRADE",
        title: "직거래 유도",
        message: `상품명/키워드에 「${pat}」 — 직거래 유도 5점·즉시 제재`,
        penaltyPoints: 5,
        mitigation: ["상품명·상세·CS에서 외부 연락처·계좌 삭제", "토스 파트너스 내 거래만"],
      });
      break;
    }
  }
}

function scanShipping(input: RiskScanInput, risks: MarketplaceRisk[]) {
  pushRisk(risks, {
    category: "shipping",
    level: "warn",
    code: "SHIP_SLA",
    standing: true,
    title: "발송 기한 SLA",
    message: "발송기한 미준수 → 셀러 1점 + 아이템 페널티(해당 옵션 미노출)",
    penaltyPoints: 1,
    mitigation: [
      "발송기한 전 「발송 지연」 기능 사용 (최대 14일 연장, 구매자 알림)",
      "휴가는 「배송 캘린더」 사전 등록 — 주말·공휴일·휴무 자동 제외",
      "송장 등록 후 +1영업일 내 택배 흐름 확인 (가송장 3점)",
    ],
  });

  if (input.mode === "import") {
    pushRisk(risks, {
      category: "shipping",
      level: "warn",
      code: "IMPORT_LEAD",
      title: "수입 배송 리드타임",
      message: "통관·해외배송 7–21일 — 발송기한을 현실적으로 설정",
      penaltyPoints: 1,
      mitigation: [
        "발송기한을 통관+국내배송 포함해 넉넉히 설정",
        "지연 예상 시 발송 지연 기능 사전 사용",
      ],
    });
  }

  if (input.priceKrw >= 15000 && input.catalogStrategy?.mode === "win_representative") {
    pushRisk(risks, {
      category: "shipping",
      level: "info",
      code: "FREE_SHIP_IW",
      title: "무료배송·오늘출발",
      message: "대표아이템 선점 시 무료배송·당일출고 가중치 큼",
      mitigation: ["조건부 무료배송(2만원+) 또는 전액 무료배송 검토", "TODAY_DELIVERY 옵션 설정"],
    });
  }
}

function scanPricing(input: RiskScanInput, risks: MarketplaceRisk[]) {
  if (input.marginPct < 8) {
    pushRisk(risks, {
      category: "pricing",
      level: "warn",
      code: "LOW_MARGIN",
      title: "저마진 · 쿠폰 함정",
      message: `마진 ${input.marginPct}% — 셀러쿠폰·배송비 시 적자 + 가격 불일치 2점`,
      penaltyPoints: 2,
      mitigation: [
        "쿠폰 적용 후에도 순마진 5% 이상 유지",
        "정상가·판매가 일치 — 과도한 할인율(미끼) 금지",
      ],
    });
  }

  if (input.catalogWin && input.catalogWin.priceGapKrw < -500) {
    pushRisk(risks, {
      category: "pricing",
      level: "warn",
      code: "PRICE_WAR",
      title: "Item Winner 가격전",
      message: `총액 ${Math.abs(input.catalogWin.priceGapKrw).toLocaleString()}원 불리 — 무리한 인하 시 마진 붕괴`,
      penaltyPoints: 2,
      mitigation: [
        "전략 B(별도 카탈로그) 전환 검토",
        "무료배송으로 총액 역전 후 마진 재계산",
      ],
    });
  }

  pushRisk(risks, {
    category: "pricing",
    level: "info",
    code: "PRICE_MATCH",
    standing: true,
    title: "판매가 불일치",
    message: "상품명·썸네일·옵션과 다른 가격 노출 → 2점",
    penaltyPoints: 2,
    mitigation: ["옵션별 판매가·정상가 동기화", "광고 직전 가격 인상 금지"],
  });
}

function scanCoupon(input: RiskScanInput, risks: MarketplaceRisk[]) {
  const marginAfterCoupon = input.marginPct - 5;
  if (marginAfterCoupon < 5) {
    pushRisk(risks, {
      category: "coupon",
      level: "warn",
      code: "COUPON_TRAP",
      title: "쿠폰 중복·적자",
      message: "셀러쿠폰 5%p 가정 시 순마진 위험 · 쿠폰 악용 10점",
      penaltyPoints: 10,
      mitigation: [
        "쿠폰 1개만 전략적 운용 — 최소주문금액 설정",
        "허수주문·셀프구매 절대 금지",
      ],
    });
  }
}

function scanCatalog(input: RiskScanInput, risks: MarketplaceRisk[]) {
  const win = input.catalogWin;
  if (!win) return;

  if (win.catalogMatchRisk === "high" && input.catalogStrategy?.mode === "win_representative") {
    pushRisk(risks, {
      category: "catalog",
      level: "warn",
      code: "IW_TRAP",
      title: "Item Winner 함정",
      message: "과밀 카탈로그에서 대표아이템 전략 — '다른 가격' 탭 노출 위험",
      mitigation: ["전략 B(세트·대용량)로 별도 카탈로그", "또는 총액·무료배송 역전"],
    });
  }

  pushRisk(risks, {
    category: "catalog",
    level: "info",
    code: "CATALOG_RULES",
    standing: true,
    title: "카탈로그 매칭 규칙",
    message: "1+1=2개 구성 · 모델명 완전일치 · 연도표기 일치 시에만 병합",
    mitigation: [
      "회피 시: 구성·용량·세트명을 기존과 다르게",
      "선점 시: 브랜드·모델·용량 정확 기재",
    ],
  });

  if (input.catalogStrategy?.mode === "avoid_catalog") {
    pushRisk(risks, {
      category: "catalog",
      level: "warn",
      code: "DUP_REGISTER",
      title: "중복 등록 위험",
      message: "차별화 없이 유사 상품 중복 등록 → 4점",
      penaltyPoints: 4,
      mitigation: [
        "옵션으로 묶을 수 있으면 단일 SKU",
        "세트/용량 차이를 상품명·상세·썸네일에 명확히",
      ],
    });
  }
}

function scanDisclosure(input: RiskScanInput, risks: MarketplaceRisk[]) {
  const fields = CATEGORY_DISCLOSURE[input.category];
  pushRisk(risks, {
    category: "disclosure",
    level: "warn",
    code: "DISCLOSURE",
    standing: true,
    title: "필수 고시사항",
    message: `누락/오기재 → 2점 · 노출중단 가능: ${fields.join(", ")}`,
    penaltyPoints: 2,
    mitigation: [
      "카테고리별 필수고시 전 항목 입력",
      "「상품 상세 참조」는 상세에 실제 기재 시만",
    ],
  });
}

function scanCertification(input: RiskScanInput, risks: MarketplaceRisk[]) {
  const cert = CATEGORY_CERT[input.category];
  pushRisk(risks, {
    category: "certification",
    level: input.category === "digital" || input.category === "health" ? "warn" : "info",
    code: "CERT_KC",
    standing: true,
    title: "KC·인증",
    message: cert.required,
    penaltyPoints: cert.penaltyPoints,
    mitigation: ["인증번호·이미지 상세 기재", "미인증 시 해당 카테고리 등록 보류"],
  });

  const text = `${input.keyword} ${input.suggestedTitle}`.toLowerCase();
  for (const claim of HEALTH_CLAIM_PATTERNS) {
    if (text.includes(claim)) {
      pushRisk(risks, {
        category: "certification",
        level: "block",
        code: "FALSE_CLAIM",
        title: "허위·과대 광고",
        message: `「${claim}」 표현 — 허위과대광고 5점·즉시 미노출`,
        penaltyPoints: 5,
        mitigation: ["기능성 표현 삭제", "식약처·표시광고법 준수 문구로 교체"],
      });
    }
  }
}

function scanCsReturns(risks: MarketplaceRisk[]) {
  pushRisk(risks, {
    category: "cs_returns",
    level: "warn",
    code: "CS_SLA",
    standing: true,
    title: "CS·반품 SLA",
    message: "1:1 문의 1영업일 미응대 4점 · 반품 승인 후 5영업일 환불 지연 3점",
    penaltyPoints: 4,
    mitigation: [
      "CS 알림 ON · 24h 내 1차 응답",
      "반품/교환 3영업일 내 처리 · 구매확정 +7일",
    ],
  });
}

function scanListing(input: RiskScanInput, risks: MarketplaceRisk[]) {
  if (input.suggestedTitle.length > 50) {
    pushRisk(risks, {
      category: "listing",
      level: "info",
      code: "TITLE_LONG",
      title: "상품명",
      message: "50자 초과 — 토스가 소비자용으로 재작성 (검색태그에 옵션·색상)",
      mitigation: ["수량·색상·맛은 검색태그 10개에", "상품명은 브랜드+핵심명사"],
    });
  }

  const tagSpam = (input.suggestedTitle.match(/[\[\]★☆♥]/g) ?? []).length;
  if (tagSpam > 2) {
    pushRisk(risks, {
      category: "listing",
      level: "warn",
      code: "TITLE_SPAM",
      title: "스팸 키워드",
      message: "특수문자·낚시 상품명 — 비정상 등록·검수 탈락",
      mitigation: ["특수문자·반복 키워드 제거", "토스 상품명 가이드 준수"],
    });
  }

  pushRisk(risks, {
    category: "listing",
    level: "info",
    code: "SEARCH_TAGS",
    standing: true,
    title: "검색 태그 10개",
    message: "태그 미등록 시 노출·추천 불리",
    mitigation: ["카테고리 필수 태그 + 롱테일 3개", "경쟁사 태그 벤치마킹"],
  });
}

function scanImport(input: RiskScanInput, risks: MarketplaceRisk[]) {
  if (input.mode !== "import") return;

  pushRisk(risks, {
    category: "import",
    level: "warn",
    code: "IMPORT_KC",
    standing: true,
    title: "수입 통관·KC",
    message: "해외직구 → KC·라벨·원산지 국문 표시 · 미준수 5점",
    penaltyPoints: 5,
    mitigation: [
      "통관 전 KC 사전 확인 (전기·어린이·식품)",
      "국문 라벨·성분표 부착 후 출고",
    ],
  });

  if (input.sourceCountry === "중국") {
    pushRisk(risks, {
      category: "import",
      level: "info",
      code: "CN_LABEL",
      title: "중국산 표시",
      message: "원산지·제조국 정확 표기 — 허위 원산지 5점",
      penaltyPoints: 5,
      mitigation: ["상품명·고시·상세 원산지 일치", "병행수입 시 병행 표시"],
    });
  }
}

function scanCommercial(input: RiskScanInput, risks: MarketplaceRisk[]) {
  // 이건 이 상품에서 감지한 문제가 아니라 **모든 판매에 항상 적용되는
  // 행동 수칙**이다. standing으로 표시해 위험 집계에서 빼지 않으면 모든
  // 상품이 항상 critical 1건을 갖게 되고, "치명 리스크 0"을 요구하는
  // 확실성 게이트를 영원히 통과하지 못한다. 실제로 그 상태였다.
  pushRisk(risks, {
    category: "commercial",
    level: "critical",
    code: "FAKE_ORDER",
    title: "허위거래·셀프구매",
    message: "셀러 직접구매·허수주문 → 10점 · 계정 정지",
    penaltyPoints: 10,
    mitigation: ["본인·지인 구매 금지", "리뷰 조작·구매평 대행 금지"],
    standing: true,
  });

  if (input.competitionIntensity > 2) {
    pushRisk(risks, {
      category: "commercial",
      level: "info",
      code: "STOCK_ACCURACY",
      title: "재고 정확도",
      message: "품절 임의취소 3점 · 반복 시 판매자 임의취소 3점",
      penaltyPoints: 3,
      mitigation: ["도매 MOQ·재고 실시간 연동", "품절 시 즉시 옵션 품절 처리"],
    });
  }
}

export function scanMarketplaceRisks(input: RiskScanInput): MarketplaceRisk[] {
  const text = `${input.keyword} ${input.productName} ${input.suggestedTitle}`;
  const risks: MarketplaceRisk[] = [];

  scanProhibited(text, risks);
  scanDirectTrade(text, risks);
  scanShipping(input, risks);
  scanPricing(input, risks);
  scanCoupon(input, risks);
  scanCatalog(input, risks);
  scanDisclosure(input, risks);
  scanCertification(input, risks);
  scanCsReturns(risks);
  scanListing(input, risks);
  scanImport(input, risks);
  scanCommercial(input, risks);

  const levelOrder = { critical: 0, block: 1, warn: 2, info: 3 };
  return risks.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
}

export function buildRiskPlaybookReport(input: RiskScanInput): RiskPlaybookReport {
  const risks = scanMarketplaceRisks(input);
  // 항상 적용되는 행동 수칙은 이 상품의 위험도가 아니므로 집계에서 뺀다.
  // 모든 상품에 똑같이 붙는 값은 상품 간 구분에 아무 정보도 주지 못하면서,
  // "치명 0" 같은 조건만 영원히 못 넘게 만든다.
  const detected = risks.filter((r) => !r.standing);
  const criticalCount = detected.filter((r) => r.level === "critical").length;
  const blockCount = detected.filter((r) => r.level === "block").length;
  // ⚠️ warn·페널티도 반드시 detected 기준이어야 한다 — 실측으로 드러난 결함
  //
  // 종전엔 critical·block만 상시 항목을 뺐고 warn과 페널티 합계는 risks
  // 전체를 썼다. 그런데 상시 항목이 8개(배송 SLA·필수고시·CS SLA·KC 안내
  // 등)나 되고, 이건 모든 상품에 똑같이 붙는 **행동 수칙**이지 이 상품의
  // 위험이 아니다.
  //
  // 그 결과 아무 문제 없는 상품의 안전점수가 이렇게 나왔다:
  //   92 - warn 3건×4 - 페널티 24/3 + 마진 3 + 카탈로그 2 = 77
  // safety 게이트 통과 기준은 85다. 즉 **어떤 상품도 통과할 수 없었다.**
  // 인증이 항상 실패하니 신뢰도는 92%로 덮이고(UNCERTIFIED_CAP), 초안은
  // status "draft"로 만들어져 자동 등록 대상에서 영원히 제외됐다.
  // 등록 0·매출 0의 마지막 원인이 이것이다.
  const warnCount = detected.filter((r) => r.level === "warn").length;

  const penaltyExposurePoints = detected.reduce((s, r) => s + (r.penaltyPoints ?? 0), 0);

  let overallSafetyScore = 92;
  overallSafetyScore -= criticalCount * 25;
  overallSafetyScore -= blockCount * 18;
  overallSafetyScore -= warnCount * 4;
  overallSafetyScore -= Math.min(penaltyExposurePoints / 3, 15);
  if (input.marginPct >= 12) overallSafetyScore += 3;
  if (input.catalogStrategy?.mode === "avoid_catalog") overallSafetyScore += 2;
  overallSafetyScore = Math.min(99, Math.max(0, Math.round(overallSafetyScore)));

  const mandatoryActions = [
    ...new Set(risks.flatMap((r) => r.mitigation).slice(0, 12)),
  ].slice(0, 8);

  const categoryCompliance = CATEGORY_DISCLOSURE[input.category];

  const playbookBrief =
    criticalCount > 0 || blockCount > 0
      ? `⚠ 리스크 ${criticalCount + blockCount + warnCount}건 · **등록 전 필수 수정** (30일 ${TOSS_PENALTY_TIER.suspendThreshold}점 정지)`
      : warnCount > 0
        ? `주의 ${warnCount}건 · 안전점수 ${overallSafetyScore} — 완화 액션 ${mandatoryActions.length}개 적용 권장`
        : `정책 양호 · 안전점수 ${overallSafetyScore} — 토스 페널티 노출 낮음`;

  return {
    engineVersion: RISK_PLAYBOOK_VERSION,
    overallSafetyScore,
    criticalCount,
    warnCount,
    blockCount,
    penaltyExposurePoints,
    risks,
    mandatoryActions,
    categoryCompliance,
    playbookBrief,
    penaltyTier: TOSS_PENALTY_TIER,
  };
}
