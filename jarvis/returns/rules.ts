/**
 * 반품 판정 기준 — 법이 정한 것과 플랫폼이 정한 것을 갈라 둔다
 *
 * ★ 왜 갈라야 하는가
 *
 * 반품 처리에서 틀리면 두 가지로 돈이 샌다: 받아야 할 반품비를 못 받거나
 * (마진 손실), 받아들여야 할 청약철회를 거절하는 것(법 위반 + 플랫폼
 * 페널티). 그런데 이 둘의 근거는 성격이 전혀 다르다.
 *
 *   · **법정 기준**은 전자상거래법에 박혀 있어 바뀌지 않는다. 확실하다.
 *   · **플랫폼 기준**(토스쇼핑의 처리 기한·페널티)은 정책이라 바뀐다.
 *
 * 이 둘을 한 덩어리로 적어두면, 플랫폼 정책이 바뀌었을 때 법정 기준까지
 * 같이 의심하게 되고, 반대로 "토스가 이렇다더라"는 말이 법정 기준인 것처럼
 * 굳어버린다. 그래서 파일 안에서 출처를 명시해 나눈다.
 *
 * ★ 지어내지 않는다
 *
 * 아래 법정 기준은 전자상거래법 제17조·제18조에 실제로 있는 값이다.
 * 플랫폼 쪽 값은 **설정으로 바꿀 수 있게** 두고, 기본값은 법정 기준보다
 * 넉넉하지 않게(= 우리에게 불리한 쪽으로) 잡았다. 정책을 모른 채 유리하게
 * 가정하면 그 차이가 그대로 페널티가 된다.
 */

export const RETURN_RULES_VERSION = "1.0";

// ─────────────────────────────────────────────────────────────
// 법정 기준 — 전자상거래 등에서의 소비자보호에 관한 법률
// ─────────────────────────────────────────────────────────────

/**
 * 단순 변심 청약철회 기간 (제17조 제1항).
 * 물품을 받은 날부터 7일. 이 안이면 이유를 묻지 않고 받아야 한다.
 */
export const WITHDRAWAL_DAYS_CHANGE_OF_MIND = 7;

/**
 * 하자·표시광고와 다른 상품일 때의 철회 기간 (제17조 제3항).
 * 안 날부터 30일, 받은 날부터 3개월 — **둘 중 먼저 오는 날**이 아니라
 * 둘 중 하나만 충족해도 되는 구조라, 실무상 넉넉한 쪽을 쓴다.
 */
export const WITHDRAWAL_DAYS_DEFECT_FROM_AWARE = 30;
export const WITHDRAWAL_DAYS_DEFECT_FROM_DELIVERY = 90;

/**
 * 청약철회를 제한할 수 있는 경우 (제17조 제2항).
 *
 * ⚠️ 제한 사유가 있다고 **자동으로 거절되는 게 아니다.** 제17조 제6항은
 * 판매자가 그 사실을 미리 알리지 않았으면 제한을 주장할 수 없게 한다.
 * 우리 상세페이지는 그런 개별 고지를 하지 않으므로, 아래 사유가 있어도
 * 자동 거절하지 않고 **사장님 확인**으로 넘긴다. 자동으로 거절했다가
 * 고지 요건을 못 갖췄으면 그게 곧 법 위반이다.
 */
export type WithdrawalLimit =
  | "consumer_damaged" // 소비자 책임으로 멸실·훼손
  | "value_dropped_by_use" // 사용·소비로 가치가 현저히 감소
  | "sealed_opened" // 복제 가능한 상품의 포장 훼손
  | "made_to_order"; // 주문에 따라 개별 생산

export const WITHDRAWAL_LIMIT_LABELS: Record<WithdrawalLimit, string> = {
  consumer_damaged: "고객 책임으로 상품이 훼손됨",
  value_dropped_by_use: "사용·소비로 상품 가치가 크게 떨어짐",
  sealed_opened: "복제 가능한 상품의 포장이 개봉됨",
  made_to_order: "주문 제작 상품",
};

/**
 * 환불 기한 (제18조 제2항).
 * 반품 상품을 받은 날부터 3영업일. 늦으면 지연이자가 붙는다.
 */
export const REFUND_DUE_BUSINESS_DAYS = 3;

// ─────────────────────────────────────────────────────────────
// 반품 사유 — 누가 배송비를 내는지가 여기서 갈린다
// ─────────────────────────────────────────────────────────────

export type ReturnReason =
  /** 단순 변심 — 반품비는 고객 부담 (제18조 제9항) */
  | "change_of_mind"
  /** 상품 하자·파손 */
  | "defective"
  /** 주문과 다른 물건이 옴 */
  | "wrong_item"
  /** 표시·광고와 다름 */
  | "not_as_described"
  /** 배송 중 파손 */
  | "damaged_in_transit"
  /** 약속한 기한을 크게 넘겨 도착 */
  | "late_delivery";

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  change_of_mind: "단순 변심",
  defective: "상품 불량·하자",
  wrong_item: "다른 상품이 왔음",
  not_as_described: "상세페이지와 다름",
  damaged_in_transit: "배송 중 파손",
  late_delivery: "배송이 너무 늦음",
};

/**
 * 판매자 귀책인가.
 *
 * 귀책이면 왕복 배송비를 판매자가 부담하고(제18조 제9항 단서), 그
 * 부담분을 공급처에 청구할 수 있는지가 그다음 문제가 된다.
 */
export function isSellerFault(reason: ReturnReason): boolean {
  return reason !== "change_of_mind";
}

// ─────────────────────────────────────────────────────────────
// 토스쇼핑 — 플랫폼 정책 (법이 아니다)
// ─────────────────────────────────────────────────────────────

/**
 * 반품 신청에 판매자가 응답해야 하는 기한.
 *
 * ⚠️ 이 값은 **법이 아니라 플랫폼 정책**이라 바뀔 수 있다. 토스쇼핑
 * 판매자 정책에서 확인한 값으로 환경변수(TOSS_RETURN_RESPONSE_HOURS)를
 * 채우면 그게 쓰인다. 기본값은 짧게(=우리에게 빡빡하게) 잡았다 —
 * 모르는 채로 넉넉히 가정하면 그 차이가 그대로 미응답 페널티가 된다.
 */
export function tossResponseDeadlineHours(): number {
  const raw = Number(process.env.TOSS_RETURN_RESPONSE_HOURS);
  return Number.isFinite(raw) && raw > 0 ? raw : 24;
}

// ─────────────────────────────────────────────────────────────
// 공급처 반품 규정 — 읽어내지 못하면 "모른다"로 둔다
// ─────────────────────────────────────────────────────────────

export type SupplierReturnPolicy = {
  /** 공급처가 직접 반품을 받아주는가 */
  acceptsReturns: "yes" | "no" | "unknown";
  /** 반품 주소를 실제로 읽었는가 */
  returnAddress?: string;
  /** 공급처가 정한 반품 가능 기간(일) — 못 읽으면 undefined */
  windowDays?: number;
  /** 판독 근거 한 줄 */
  reason: string;
};

/**
 * 공급처 안내 원문에서 반품 규정을 읽는다.
 *
 * ★ fail-closed: 못 읽으면 `unknown`이다.
 *
 * "대부분의 도매 공급처는 반품을 받아준다"는 추측으로 `yes`를 넣으면,
 * 실제로 안 받아주는 공급처의 반품이 우리 창고(사장님 집)로 오고 그
 * 비용과 재고가 통째로 우리 것이 된다. 모르면 모른다고 해야 그다음
 * 판단(셀러 경유·비용 반영)이 제대로 돈다.
 */
export function readSupplierReturnPolicy(input: {
  policyText?: string;
  returnAddress?: string;
}): SupplierReturnPolicy {
  const text = (input.policyText ?? "").replace(/\s+/g, " ").trim();
  const address = input.returnAddress?.trim() || undefined;

  if (!text) {
    return {
      acceptsReturns: "unknown",
      returnAddress: address,
      reason: "공급처 반품 안내를 읽지 못했습니다",
    };
  }

  // 거절 표현이 있으면 그게 우선이다 — "반품 가능"과 "단순변심 반품 불가"가
  // 같은 문단에 있을 때 앞의 표현만 보고 가능으로 읽으면 최악이다
  if (/반품\s*불가|교환\s*·?\s*반품\s*불가|반품이?\s*안\s*됩/.test(text)) {
    return {
      acceptsReturns: "no",
      returnAddress: address,
      reason: "공급처가 반품 불가를 명시했습니다",
    };
  }

  const windowMatch = text.match(/(\d{1,2})\s*일\s*(?:이내|안에|이내에)?\s*(?:반품|교환)/);
  const windowDays = windowMatch ? Number(windowMatch[1]) : undefined;

  if (/반품\s*가능|반품\s*접수|반품\s*주소|교환\s*·?\s*반품\s*안내/.test(text)) {
    return {
      acceptsReturns: "yes",
      returnAddress: address,
      windowDays: windowDays && windowDays > 0 ? windowDays : undefined,
      reason: address
        ? "공급처 반품 안내와 반품 주소를 읽었습니다"
        : "공급처 반품 안내를 읽었지만 반품 주소가 없습니다",
    };
  }

  return {
    acceptsReturns: "unknown",
    returnAddress: address,
    windowDays: windowDays && windowDays > 0 ? windowDays : undefined,
    reason: "공급처 안내에서 반품 가능 여부를 판단할 문구를 못 찾았습니다",
  };
}
