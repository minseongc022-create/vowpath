/**
 * 공급처 안내 종합 판독 — 반품만이 아니라 **등록에 필요한 사실 전부**를 읽는다
 *
 * ★ 왜 반품 정책만으로는 부족한가
 *
 * 상품을 토스에 올릴 때 채워야 하는 값은 반품지 하나가 아니다. 반품 배송비,
 * 교환 배송비, 출고 소요일, 도서산간 추가비, 묶음배송 가능 여부 — 이걸 전부
 * 공급처 안내에서 읽어 넣어야 등록이 "맞게" 된다.
 *
 * 이 값들을 대충 넣으면 조용히 돈이 샌다:
 *  · 반품 배송비를 실제보다 낮게 걸면 → 차액을 셀러가 문다.
 *  · 출고 소요일을 짧게 걸면 → 발송기한 미준수 → 페널티 → 배송 인센티브(수수료 0%) 상실.
 *  · 도서산간 추가비를 안 걸면 → 제주·도서 주문마다 실비 손실.
 *
 * 그래서 반품 판독(supplier-return-policy)과 같은 원칙으로 여기서도 fail-closed다:
 * **못 읽은 값은 지어내지 않고 undefined로 둔다.** 상위(등록 페이로드 구성)가
 * 보수적 기본값을 쓰되, 그게 추정임을 알 수 있어야 하기 때문이다.
 *
 * ★ 숫자를 읽을 때 가장 위험한 실수
 *
 * "반품 배송비 3,000원 (편도) / 왕복 6,000원" 같은 문장에서 앞 숫자만 집으면
 * 절반을 잃는다. 그래서 왕복·편도 표기를 함께 보고, 왕복이 명시되면 그 값을 쓴다.
 * 여러 값이 충돌하면 **큰 쪽**을 택한다 — 과소 계상은 손실이지만 과대 계상은
 * 기회 손실에 그치기 때문이다.
 */

export const SUPPLIER_POLICY_READER_VERSION = "1.0";

export type ReadNumber = {
  /** 읽어낸 값 */
  value: number;
  /** 근거가 된 문구 — 사후 검증용 */
  matched: string;
};

export type SupplierPolicyFacts = {
  engineVersion: string;
  /** 반품(청약철회) 배송비 — 왕복 기준 */
  returnShippingKrw?: ReadNumber;
  /** 교환 배송비 — 왕복 기준 */
  exchangeShippingKrw?: ReadNumber;
  /** 출고까지 걸리는 영업일 */
  dispatchDays?: ReadNumber;
  /** 도서산간 추가 배송비 */
  remoteAreaSurchargeKrw?: ReadNumber;
  /** 묶음배송 가능 여부 — 판독 못 하면 undefined */
  bundleShipping?: boolean;
  /** 판독한 항목 수 — 안내가 얼마나 충실했는지 */
  readCount: number;
  /** 사람이 읽는 요약 */
  summary: string;
};

// ─────────────────────────────────────────────────────────────
// 숫자 판독
// ─────────────────────────────────────────────────────────────

/** "3,000원" / "3000 원" / "3천원" 형태를 숫자로 */
function parseKrw(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "");
  const man = cleaned.match(/(\d+(?:\.\d+)?)만/);
  if (man) return Math.round(Number.parseFloat(man[1]) * 10_000);
  const cheon = cleaned.match(/(\d+(?:\.\d+)?)천/);
  if (cheon) return Math.round(Number.parseFloat(cheon[1]) * 1_000);
  const plain = cleaned.match(/(\d{3,7})/);
  if (plain) {
    const n = Number.parseInt(plain[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * 배송비 문구에서 **왕복 기준** 금액을 뽑는다.
 *
 * 편도만 적혀 있으면 2배로 환산한다 — 반품은 보내고 받는 두 구간이 다 든다.
 * 편도/왕복 표기가 없으면 적힌 값을 그대로 쓰되, 그게 편도일 가능성이 있으므로
 * 상위에서 보수적으로 다루도록 값만 넘긴다.
 */
function readShippingFee(text: string, labels: string[]): ReadNumber | undefined {
  const labelGroup = labels.join("|");
  // 라벨 뒤 40자 안에 나오는 금액을 후보로 본다 — 더 멀면 다른 항목일 수 있다
  const re = new RegExp(`(${labelGroup})[^\\n]{0,40}?([\\d,]{3,9}\\s*원|\\d+\\s*[만천]\\s*원)`, "g");

  const found: ReadNumber[] = [];
  for (const m of text.matchAll(re)) {
    const amount = parseKrw(m[2]);
    if (amount == null || amount <= 0 || amount > 200_000) continue;

    // 편도/왕복 표기는 금액 **뒤에** 오는 경우가 많다 ("3,000원 (편도)").
    // 매치 문자열은 금액에서 끝나므로, 원문에서 뒤쪽 문맥까지 같이 본다.
    // 이걸 놓치면 편도 금액을 왕복으로 걸어 반품 1건마다 절반이 손실이 된다.
    const start = m.index ?? 0;
    const window = text.slice(start, start + m[0].length + 20).split("\n")[0];

    const isRoundTrip = /왕복/.test(window);
    const isOneWay = /편도/.test(window);
    const value = isRoundTrip ? amount : isOneWay ? amount * 2 : amount;
    found.push({ value, matched: window.replace(/\s+/g, " ").trim() });
  }

  if (!found.length) return undefined;
  // 충돌하면 큰 쪽 — 과소 계상은 실손실, 과대 계상은 기회손실에 그친다
  return found.reduce((a, b) => (b.value > a.value ? b : a));
}

/** 출고 소요일 — "당일발송" / "2~3일 이내 출고" / "익일발송" */
function readDispatchDays(text: string): ReadNumber | undefined {
  if (/당일\s*(발송|출고|배송)/.test(text)) {
    const m = text.match(/당일\s*(발송|출고|배송)/);
    return { value: 0, matched: m?.[0] ?? "당일발송" };
  }
  if (/(익일|다음\s*날)\s*(발송|출고)/.test(text)) {
    const m = text.match(/(익일|다음\s*날)\s*(발송|출고)/);
    return { value: 1, matched: m?.[0] ?? "익일발송" };
  }
  // "2~3일", "3영업일 이내" — 범위면 늦은 쪽을 쓴다(발송기한 준수가 인센티브 조건)
  const range = text.match(/(\d+)\s*[~\-–]\s*(\d+)\s*(영업일|일)\s*(이내)?\s*(발송|출고)/);
  if (range) {
    return { value: Number.parseInt(range[2], 10), matched: range[0].replace(/\s+/g, " ") };
  }
  const single = text.match(/(\d+)\s*(영업일|일)\s*(이내)?\s*(발송|출고)/);
  if (single) {
    const n = Number.parseInt(single[1], 10);
    if (n >= 0 && n <= 30) return { value: n, matched: single[0].replace(/\s+/g, " ") };
  }
  return undefined;
}

/** 도서산간 추가 배송비 */
function readRemoteSurcharge(text: string): ReadNumber | undefined {
  const re = /(도서\s*산간|제주|산간\s*지역|도서\s*지방)[^\n]{0,40}?([\d,]{3,9}\s*원|\d+\s*[만천]\s*원)/g;
  const found: ReadNumber[] = [];
  for (const m of text.matchAll(re)) {
    const amount = parseKrw(m[2]);
    if (amount == null || amount <= 0 || amount > 100_000) continue;
    found.push({ value: amount, matched: m[0].replace(/\s+/g, " ").trim() });
  }
  if (!found.length) return undefined;
  return found.reduce((a, b) => (b.value > a.value ? b : a));
}

/**
 * 묶음배송 가능 여부.
 *
 * 불가 신호를 먼저 본다 — 가능하다고 잘못 판단하면 여러 건 주문에서
 * 배송비를 한 번만 받고 실제로는 건별로 나가 손실이 된다.
 */
function readBundleShipping(text: string): boolean | undefined {
  if (/묶음\s*배송\s*(불가|안됨|불가능|제외)/.test(text)) return false;
  if (/개별\s*배송\s*(만|만\s*가능)/.test(text)) return false;
  if (/묶음\s*배송\s*(가능|가능함|됩니다|지원)/.test(text)) return true;
  return undefined;
}

// ─────────────────────────────────────────────────────────────

/**
 * 공급처 안내 원문에서 등록에 필요한 사실을 한 번에 읽는다.
 *
 * 못 읽은 항목은 undefined로 남는다 — 지어내면 그 숫자로 상품이 등록되고,
 * 차액은 전부 셀러가 문다.
 */
export function readSupplierPolicyFacts(text: string | undefined | null): SupplierPolicyFacts {
  const base = { engineVersion: SUPPLIER_POLICY_READER_VERSION };
  if (!text?.trim()) {
    return {
      ...base,
      readCount: 0,
      summary: "공급처 안내 원문이 없어 배송·반품 조건을 읽지 못했습니다 — 보수적 기본값이 적용됩니다.",
    };
  }

  const norm = text.replace(/[ 　]+/g, " ").replace(/\s*\n\s*/g, "\n");

  const returnShippingKrw = readShippingFee(norm, ["반품\\s*배송비", "반품비", "반송비", "환불\\s*배송비"]);
  const exchangeShippingKrw = readShippingFee(norm, ["교환\\s*배송비", "교환비"]);
  const dispatchDays = readDispatchDays(norm);
  const remoteAreaSurchargeKrw = readRemoteSurcharge(norm);
  const bundleShipping = readBundleShipping(norm);

  const readCount = [
    returnShippingKrw,
    exchangeShippingKrw,
    dispatchDays,
    remoteAreaSurchargeKrw,
    bundleShipping !== undefined ? {} : undefined,
  ].filter(Boolean).length;

  const parts: string[] = [];
  if (dispatchDays) {
    parts.push(dispatchDays.value === 0 ? "당일 출고" : `출고 ${dispatchDays.value}일`);
  }
  if (returnShippingKrw) parts.push(`반품비 ${returnShippingKrw.value.toLocaleString()}원`);
  if (exchangeShippingKrw) parts.push(`교환비 ${exchangeShippingKrw.value.toLocaleString()}원`);
  if (remoteAreaSurchargeKrw) {
    parts.push(`도서산간 +${remoteAreaSurchargeKrw.value.toLocaleString()}원`);
  }
  if (bundleShipping === false) parts.push("묶음배송 불가");

  return {
    ...base,
    returnShippingKrw,
    exchangeShippingKrw,
    dispatchDays,
    remoteAreaSurchargeKrw,
    bundleShipping,
    readCount,
    summary: parts.length
      ? `공급처 안내에서 ${readCount}개 항목 판독 — ${parts.join(" · ")}`
      : "공급처 안내는 있으나 배송·반품 조건을 특정하지 못했습니다 — 보수적 기본값이 적용됩니다.",
  };
}

/**
 * 판독한 사실을 **토스 등록에 넣을 값**으로 환산한다.
 *
 * 못 읽은 항목에는 보수적 기본값을 쓴다. 보수적이라는 건 "셀러가 손해 안 보는
 * 쪽"이라는 뜻이다 — 반품비는 넉넉히, 출고일은 여유 있게. 등록 후 실제 정산으로
 * 확인되면 그때 조이면 된다. 반대로 하면 첫 주문부터 돈이 샌다.
 */
export const POLICY_DEFAULTS = {
  /** 국내 표준 반품 왕복 택배비 */
  returnShippingKrw: 6_000,
  /** 교환은 왕복 + 재발송이라 반품보다 크다 */
  exchangeShippingKrw: 6_000,
  /**
   * 출고 소요일 기본값.
   *
   * 토스 배송 품질 인센티브(수수료 0%)의 조건 중 하나가 **발송기한 준수율 100%**다.
   * 공급처 출고 속도를 모르는 상태에서 짧게 걸면 한 건만 늦어도 인센티브가 날아간다.
   * 그래서 모를 때는 넉넉히 잡는다 — 빠른 건 문제가 안 되지만 늦는 건 문제가 된다.
   */
  dispatchDays: 2,
} as const;

export type ListingPolicyValues = {
  returnShippingKrw: number;
  exchangeShippingKrw: number;
  dispatchDays: number;
  remoteAreaSurchargeKrw: number;
  /** 각 값이 판독된 것인지 기본값인지 — 초안에 남겨 사후 검증에 쓴다 */
  measured: {
    returnShipping: boolean;
    exchangeShipping: boolean;
    dispatch: boolean;
    remoteSurcharge: boolean;
  };
};

export function toListingPolicyValues(facts: SupplierPolicyFacts): ListingPolicyValues {
  return {
    returnShippingKrw: facts.returnShippingKrw?.value ?? POLICY_DEFAULTS.returnShippingKrw,
    exchangeShippingKrw: facts.exchangeShippingKrw?.value ?? POLICY_DEFAULTS.exchangeShippingKrw,
    dispatchDays: facts.dispatchDays?.value ?? POLICY_DEFAULTS.dispatchDays,
    remoteAreaSurchargeKrw: facts.remoteAreaSurchargeKrw?.value ?? 0,
    measured: {
      returnShipping: Boolean(facts.returnShippingKrw),
      exchangeShipping: Boolean(facts.exchangeShippingKrw),
      dispatch: Boolean(facts.dispatchDays),
      remoteSurcharge: Boolean(facts.remoteAreaSurchargeKrw),
    },
  };
}
