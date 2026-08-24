/**
 * 공급처 반품 정책 판독 — "이 반품은 누구 주소로 가야 하는가"
 *
 * ★ 왜 필요한가 — 반품지를 잘못 걸면 건당 손실이 확정된다:
 *
 * 위탁 공급처는 반품 처리 방식이 크게 세 갈래다.
 *  1) 공급처 직접 수거형 — 반품지가 **그 공급처 주소**여야 한다.
 *     셀러 주소로 걸어두면 고객→셀러→공급처 재발송이 되어 왕복 택배비 손실.
 *  2) 셀러 처리형 — 반품지가 **셀러 자체 주소**여야 한다.
 *     공급처 주소로 걸면 공급처가 수취 거부 → 반품 미아 → 분쟁 → 페널티.
 *  3) 반품 불가/조건부 — 애초에 소싱하면 안 되는 공급처.
 *     토스는 청약철회를 보장해야 하므로, 반품 거부 공급처를 물면
 *     반품 비용을 셀러가 전액 떠안는다.
 *
 * ★ 가장 위험한 시나리오 (이 모듈이 존재하는 직접적 이유):
 * 셀러가 예전에 A공급처 상품을 팔면서 A의 주소를 토스에 반품지로 등록해뒀다.
 * 그게 기본 반품지가 되어 있으면, 이후 B·C·D 공급처 상품이 전부
 * **A의 주소로 반품**되도록 등록된다. A는 남의 물건이라 수취를 거부하고,
 * 반품은 미아가 되고, 분쟁과 페널티는 셀러가 받는다.
 * → 그래서 기본 반품지는 "셀러 자체 주소"임이 **선언된 경우에만** 폴백으로
 *   쓸 수 있어야 한다. 성격 미상의 기본값은 공급처 수거형 상품에 쓰면 안 된다.
 *
 * ⚠️ fail-closed:
 * 정책 텍스트를 못 읽으면 `unknown`으로 두고, 그 상품은 "공급처 전용 반품지가
 * 반드시 필요한 것으로 간주"한다. 추측으로 셀러 주소를 걸면 위 1)번 손실이
 * 조용히 누적된다 — supplier-quality.ts와 같은 원칙.
 */

export const RETURN_POLICY_ENGINE_VERSION = "1.0";

export type ReturnHandling =
  /** 공급처가 직접 수거 — 반품지는 공급처 주소여야 한다 */
  | "supplier_collects"
  /** 셀러가 받아서 처리 — 반품지는 셀러 자체 주소 */
  | "seller_handles"
  /** 반품 불가·과도한 조건 — 소싱 제외 대상 */
  | "refused"
  /** 판독 실패 — 공급처 전용 반품지 필요로 간주(fail-closed) */
  | "unknown";

export type SupplierReturnPolicy = {
  engineVersion: string;
  handling: ReturnHandling;
  /** 텍스트에서 실제로 판독했는가 (추정 아님) */
  verified: boolean;
  /** 반품 배송비를 고객이 아닌 셀러가 부담해야 하는 정황 */
  sellerBearsReturnShipping: boolean;
  /** 판독 근거가 된 문구 — 사후 검증·디버깅용 */
  matchedPhrases: string[];
  /** 반품 주소로 보이는 문자열 (있으면 셀러가 토스에 등록할 때 참고) */
  detectedAddress?: string;
  reason: string;
};

// ─────────────────────────────────────────────────────────────
// 판독 규칙
//
// 도매 상세페이지의 반품 안내는 표준 양식이 없어 표현이 제각각이다.
// 그래서 "확실한 신호"만 규칙으로 넣고, 애매하면 unknown으로 남긴다.
// ─────────────────────────────────────────────────────────────

/** 공급처가 직접 수거·회수한다는 신호 */
const SUPPLIER_COLLECT_PATTERNS = [
  /공급\s*(사|처|업체)\s*(에서)?\s*(직접)?\s*(수거|회수|반품\s*접수)/,
  /(본사|당사|저희)\s*(에서)?\s*(직접)?\s*(수거|회수)/,
  /반품\s*(주소|지)\s*[:：]?\s*(공급|본사|당사)/,
  /수거\s*(요청|접수)\s*(는|은)?\s*(공급|본사|당사|고객센터)/,
  /반품\s*시\s*(공급|본사|당사)\s*(로|으로)\s*(연락|접수)/,
];

/** 셀러(구매자=재판매자)가 받아서 처리해야 한다는 신호 */
const SELLER_HANDLE_PATTERNS = [
  /(판매자|셀러|구매자)\s*(가|께서)?\s*(직접)?\s*(반품|회수|처리)/,
  /반품\s*(은|는)\s*(판매자|셀러|구매자)\s*(부담|처리|책임)/,
  /(각자|자체)\s*(반품|회수)\s*처리/,
];

/** 반품 자체가 안 되는 신호 — 소싱 제외 */
const REFUSED_PATTERNS = [
  /반품\s*(및|과)?\s*교환\s*(이)?\s*(절대)?\s*(불가|안됨|불가능)/,
  /단순\s*변심\s*(에\s*의한)?\s*반품\s*불가/,
  /(주문\s*제작|맞춤\s*제작).{0,20}(반품|교환)\s*불가/,
  /반품\s*불가\s*(상품|제품)/,
];

/** 반품 배송비를 셀러가 떠안게 되는 신호 */
const SELLER_PAYS_PATTERNS = [
  /반품\s*(배송|택배)\s*비\s*(는|은)?\s*(판매자|셀러|구매자)\s*부담/,
  /왕복\s*(배송|택배)\s*비\s*(부담|청구)/,
];

/** 반품 주소로 보이는 줄 — 한국 주소 패턴 (시/도 + 구/군 + 로/길) */
const ADDRESS_PATTERN =
  /((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s*[^\n,;|]{4,60}(?:로|길|동|가)\s*[^\n,;|]{0,30})/;

function collectMatches(text: string, patterns: RegExp[]): string[] {
  const hits: string[] = [];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) hits.push(m[0].replace(/\s+/g, " ").trim());
  }
  return hits;
}

/**
 * 공급처 상세/정책 텍스트에서 반품 처리 방식을 판독한다.
 *
 * @param text 상품 상세 설명·반품 안내·공급처 공지 등을 합친 원문
 */
export function readSupplierReturnPolicy(text: string | undefined | null): SupplierReturnPolicy {
  const base = { engineVersion: RETURN_POLICY_ENGINE_VERSION };

  if (!text || !text.trim()) {
    return {
      ...base,
      handling: "unknown",
      verified: false,
      sellerBearsReturnShipping: false,
      matchedPhrases: [],
      reason: "반품 안내 텍스트 없음 — 공급처 전용 반품지가 필요한 것으로 간주(fail-closed)",
    };
  }

  // 공백·전각문자를 정규화해서 패턴이 안정적으로 걸리게 한다
  const norm = text.replace(/[ 　]/g, " ").replace(/\s+/g, " ");

  const refused = collectMatches(norm, REFUSED_PATTERNS);
  if (refused.length) {
    return {
      ...base,
      handling: "refused",
      verified: true,
      sellerBearsReturnShipping: true,
      matchedPhrases: refused,
      reason: `반품 불가 공급처 — "${refused[0]}". 토스는 청약철회를 보장해야 하므로 반품 비용을 셀러가 전액 부담하게 된다. 소싱 제외 대상.`,
    };
  }

  const supplierHits = collectMatches(norm, SUPPLIER_COLLECT_PATTERNS);
  const sellerHits = collectMatches(norm, SELLER_HANDLE_PATTERNS);
  const paysHits = collectMatches(norm, SELLER_PAYS_PATTERNS);
  const sellerBearsReturnShipping = paysHits.length > 0;

  const addrMatch = norm.match(ADDRESS_PATTERN);
  const detectedAddress = addrMatch?.[1]?.trim();

  // 양쪽 신호가 동시에 잡히면 판독이 신뢰할 수 없다 → unknown (추측 금지)
  if (supplierHits.length && sellerHits.length) {
    return {
      ...base,
      handling: "unknown",
      verified: false,
      sellerBearsReturnShipping,
      matchedPhrases: [...supplierHits, ...sellerHits],
      detectedAddress,
      reason:
        "공급처 수거·셀러 처리 신호가 동시에 잡혀 판독 불가 — 공급처 전용 반품지가 필요한 것으로 간주",
    };
  }

  if (supplierHits.length) {
    return {
      ...base,
      handling: "supplier_collects",
      verified: true,
      sellerBearsReturnShipping,
      matchedPhrases: supplierHits,
      detectedAddress,
      reason:
        `공급처 직접 수거 — "${supplierHits[0]}". 반품지를 이 공급처 주소로 등록해야 한다. ` +
        "셀러 주소로 등록하면 고객→셀러→공급처 재발송으로 왕복 택배비가 손실된다.",
    };
  }

  if (sellerHits.length) {
    return {
      ...base,
      handling: "seller_handles",
      verified: true,
      sellerBearsReturnShipping,
      matchedPhrases: sellerHits,
      detectedAddress,
      reason: `셀러 처리 — "${sellerHits[0]}". 반품지를 셀러 자체 주소로 등록해야 한다.`,
    };
  }

  return {
    ...base,
    handling: "unknown",
    verified: false,
    sellerBearsReturnShipping,
    matchedPhrases: [],
    detectedAddress,
    reason:
      "반품 처리 주체를 명시한 문구를 찾지 못함 — 공급처 전용 반품지가 필요한 것으로 간주(fail-closed)",
  };
}

/**
 * 이 공급처 상품이 **셀러 자체 반품지로 등록해도 안전한가**.
 *
 * seller_handles로 명확히 판독된 경우에만 true.
 * unknown·supplier_collects는 전부 false — 공급처 전용 반품지가 있어야 한다.
 * 이게 "예전 공급처 주소가 엉뚱한 상품에 붙는" 사고를 막는 핵심 판정이다.
 */
export function canUseSellerOwnedReturnLocation(p: SupplierReturnPolicy | undefined): boolean {
  return p?.handling === "seller_handles";
}

/** 소싱 자체를 막아야 하는 공급처인가 */
export function isReturnPolicyDisqualifying(p: SupplierReturnPolicy | undefined): boolean {
  return p?.handling === "refused";
}

export function returnHandlingLabel(h: ReturnHandling): string {
  return h === "supplier_collects"
    ? "공급처 직접수거"
    : h === "seller_handles"
      ? "셀러 처리"
      : h === "refused"
        ? "반품 불가(제외)"
        : "미확인";
}
