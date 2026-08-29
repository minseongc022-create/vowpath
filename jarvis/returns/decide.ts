/**
 * 반품 판정 — 신청 하나를 받아 "무엇을 할지"까지 정한다
 *
 * ★ 사장님 요구
 *
 * "주문이 들어오고 배송까지 다 했는데 반품신청 오면 그것도 공급처 규정과
 * 토스 규정에 잘 맞게 알아서 잘 처리하게."
 *
 * ★ 판정이 답해야 하는 것 네 가지
 *
 *   1. 받아들이는가        — 법정 철회기간 안인가, 제한 사유가 있는가
 *   2. 배송비는 누가 내는가 — 귀책이 어디인가
 *   3. 물건은 어디로 가는가 — 공급처 직송인가, 우리를 거치는가
 *   4. 얼마를 돌려주는가    — 상품가에서 무엇을 뺄 수 있는가
 *
 * ★ 자동으로 **거절하지는** 않는다
 *
 * 받아들이는 쪽은 자동으로 간다 — 법정 기간 안의 청약철회는 판단할 여지가
 * 없고, 미루면 그게 곧 위반이다. 반대로 거절은 절대 자동으로 하지 않는다.
 * 전자상거래법 제17조 제6항은 철회 제한 사유를 **미리 고지하지 않았으면
 * 주장할 수 없게** 한다. 우리는 상품별 개별 고지를 하지 않으므로, 제한
 * 사유가 보여도 "사장님 확인"으로만 넘긴다. 자동 거절했다가 고지 요건을
 * 못 갖췄으면 그 자체가 법 위반이고 플랫폼 페널티다.
 *
 * 즉 이 두뇌는 **고객에게 유리한 쪽으로만 자동**이다. 그게 법과 플랫폼
 * 양쪽에서 안전한 유일한 방향이다.
 */

import {
  isSellerFault,
  readSupplierReturnPolicy,
  RETURN_REASON_LABELS,
  REFUND_DUE_BUSINESS_DAYS,
  tossResponseDeadlineHours,
  WITHDRAWAL_DAYS_CHANGE_OF_MIND,
  WITHDRAWAL_DAYS_DEFECT_FROM_DELIVERY,
  WITHDRAWAL_LIMIT_LABELS,
  type ReturnReason,
  type SupplierReturnPolicy,
  type WithdrawalLimit,
} from "./rules";

export const RETURN_DECIDE_VERSION = "1.0";

export type ReturnRequest = {
  /** 반품 신청 식별자 (토스 반품번호가 있으면 그것) */
  id: string;
  reason: ReturnReason;
  /** 고객이 물건을 받은 날 */
  deliveredAt: string;
  /** 반품을 신청한 시각 */
  requestedAt: string;
  /** 고객이 낸 상품 금액 */
  paidKrw: number;
  /** 고객이 처음 낸 배송비 (무료배송이면 0) */
  outboundShippingKrw: number;
  /** 반품 택배비 실비 */
  returnShippingKrw: number;
  /** 확인된 청약철회 제한 사유 — 확인된 것만 넣는다 */
  limits?: WithdrawalLimit[];
  /** 고객이 쓴 사유 원문 */
  note?: string;
};

export type ReturnDecision = {
  /** 자동으로 처리할 수 있는가 */
  action: "accept" | "needs_owner";
  /** 반품비를 누가 내는가 */
  shippingBearer: "customer" | "seller";
  /** 고객에게 돌려줄 금액 */
  refundKrw: number;
  /** 환불에서 뺀 금액과 그 이유 */
  deductions: Array<{ label: string; krw: number }>;
  /** 물건이 갈 곳 */
  shipBackTo: "supplier" | "seller";
  /** 공급처에 지금 무엇을 해야 하는가 */
  supplierAction: string;
  /** 언제까지 해야 하는가 */
  respondByIso: string;
  refundDueBusinessDays: number;
  /** 사람이 읽는 판정 근거 — 화면과 기록에 그대로 남는다 */
  reasons: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return Number.NaN;
  return (to - from) / DAY_MS;
}

/** 철회 기간 안인가 — 사유에 따라 기간이 다르다 */
export function withinWithdrawalWindow(req: ReturnRequest): {
  ok: boolean;
  days: number;
  limitDays: number;
} {
  const days = daysBetween(req.deliveredAt, req.requestedAt);
  const limitDays = isSellerFault(req.reason)
    ? WITHDRAWAL_DAYS_DEFECT_FROM_DELIVERY
    : WITHDRAWAL_DAYS_CHANGE_OF_MIND;
  // 날짜를 못 읽으면 기간 안으로 본다 — 우리 데이터 문제로 고객의 권리를
  // 깎으면 안 된다. 대신 아래에서 사장님 확인으로 넘긴다.
  if (!Number.isFinite(days)) return { ok: true, days: Number.NaN, limitDays };
  return { ok: days <= limitDays, days, limitDays };
}

export function decideReturn(input: {
  request: ReturnRequest;
  supplier: { policyText?: string; returnAddress?: string };
  now?: Date;
}): ReturnDecision {
  const req = input.request;
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  const deductions: Array<{ label: string; krw: number }> = [];

  const policy: SupplierReturnPolicy = readSupplierReturnPolicy(input.supplier);
  const sellerFault = isSellerFault(req.reason);
  const window = withinWithdrawalWindow(req);

  reasons.push(`반품 사유: ${RETURN_REASON_LABELS[req.reason]}`);

  // ── 1. 받아들이는가 ──────────────────────────────────────
  let action: ReturnDecision["action"] = "accept";

  if (!Number.isFinite(window.days)) {
    action = "needs_owner";
    reasons.push("배송 완료일을 읽지 못해 기간을 계산할 수 없습니다 — 확인이 필요합니다");
  } else if (window.ok) {
    reasons.push(
      `수령 ${Math.floor(window.days)}일째 신청 — 법정 철회기간(${window.limitDays}일) 안입니다`,
    );
  } else {
    action = "needs_owner";
    reasons.push(
      `수령 ${Math.floor(window.days)}일째 신청 — 법정 철회기간(${window.limitDays}일)을 넘었습니다`,
    );
  }

  const limits = req.limits ?? [];
  if (limits.length) {
    action = "needs_owner";
    reasons.push(
      `철회 제한 사유가 확인됐습니다: ${limits.map((l) => WITHDRAWAL_LIMIT_LABELS[l]).join(", ")}. ` +
        "다만 미리 고지하지 않았다면 이를 이유로 거절할 수 없어(전자상거래법 제17조 제6항) " +
        "자동으로 거절하지 않고 확인을 받습니다.",
    );
  }

  // ── 2. 배송비는 누가 내는가 ──────────────────────────────
  const shippingBearer: ReturnDecision["shippingBearer"] = sellerFault ? "seller" : "customer";
  if (sellerFault) {
    reasons.push("판매자 귀책이라 왕복 배송비는 판매자가 부담합니다 (제18조 제9항 단서)");
  } else {
    reasons.push("단순 변심이라 반품 배송비는 고객이 부담합니다 (제18조 제9항)");
  }

  // ── 3. 얼마를 돌려주는가 ─────────────────────────────────
  //
  // 상품가는 전액이 원칙이다. 단순 변심일 때만 반품 택배비를 뺀다.
  // 처음 낸 배송비는 판매자 귀책일 때만 돌려준다.
  let refundKrw = req.paidKrw;

  if (!sellerFault && req.returnShippingKrw > 0) {
    deductions.push({ label: "반품 택배비 (고객 부담)", krw: req.returnShippingKrw });
    refundKrw -= req.returnShippingKrw;
  }
  if (sellerFault && req.outboundShippingKrw > 0) {
    refundKrw += req.outboundShippingKrw;
    reasons.push(
      `판매자 귀책이라 처음 받은 배송비 ${req.outboundShippingKrw.toLocaleString()}원도 함께 돌려드립니다`,
    );
  }

  // 상품가보다 많이 빼서 마이너스가 나오면 안 된다 — 고객에게 청구하는
  // 모양이 되고, 그건 반품 처리가 아니라 분쟁이다
  if (refundKrw < 0) {
    refundKrw = 0;
    action = "needs_owner";
    reasons.push("공제액이 결제액보다 커서 자동 처리하지 않습니다 — 확인이 필요합니다");
  }

  // ── 4. 물건은 어디로 가는가 ──────────────────────────────
  let shipBackTo: ReturnDecision["shipBackTo"];
  let supplierAction: string;

  if (policy.acceptsReturns === "yes" && policy.returnAddress) {
    shipBackTo = "supplier";
    supplierAction = `공급처 반품 주소로 회수 접수: ${policy.returnAddress}`;
    reasons.push("공급처가 반품을 받아주고 주소도 확인돼 공급처로 바로 보냅니다");
  } else if (policy.acceptsReturns === "no") {
    shipBackTo = "seller";
    supplierAction =
      "공급처가 반품을 받지 않습니다 — 물건은 판매자가 회수하고, 재판매·폐기를 사장님이 정해야 합니다";
    action = "needs_owner";
    reasons.push(
      "공급처 반품 불가라 상품과 비용이 전부 판매자 부담이 됩니다 — 손실이 생기므로 확인을 받습니다",
    );
  } else {
    // 모른다 — 추측으로 공급처에 보냈다가 반송되면 왕복이 두 번 나간다
    shipBackTo = "seller";
    supplierAction = `공급처 반품 가능 여부를 확인해야 합니다 (${policy.reason})`;
    action = "needs_owner";
    reasons.push(
      "공급처 반품 규정을 못 읽어 회수지를 확정할 수 없습니다 — 추측으로 보내면 반송 왕복비가 또 나갑니다",
    );
  }

  if (
    sellerFault &&
    policy.acceptsReturns === "yes" &&
    (req.returnShippingKrw > 0 || req.outboundShippingKrw > 0)
  ) {
    supplierAction += " · 불량·오배송이므로 왕복 배송비를 공급처에 청구";
  }

  // ── 5. 언제까지 ──────────────────────────────────────────
  const respondBy = new Date(now.getTime() + tossResponseDeadlineHours() * 60 * 60 * 1000);
  reasons.push(
    `토스 반품 응답 기한 ${tossResponseDeadlineHours()}시간 · 환불은 상품 회수 후 ${REFUND_DUE_BUSINESS_DAYS}영업일 이내 (제18조 제2항)`,
  );

  return {
    action,
    shippingBearer,
    refundKrw,
    deductions,
    shipBackTo,
    supplierAction,
    respondByIso: respondBy.toISOString(),
    refundDueBusinessDays: REFUND_DUE_BUSINESS_DAYS,
    reasons,
  };
}

/** 문자·화면에 쓸 한 줄 */
export function summarizeDecision(d: ReturnDecision): string {
  const head = d.action === "accept" ? "자동 승인" : "사장님 확인 필요";
  const bearer = d.shippingBearer === "seller" ? "배송비 판매자 부담" : "반품비 고객 부담";
  const where = d.shipBackTo === "supplier" ? "공급처 회수" : "판매자 회수";
  return `${head} · ${d.refundKrw.toLocaleString()}원 환불 · ${bearer} · ${where}`;
}
