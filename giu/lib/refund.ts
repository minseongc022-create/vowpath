import { GIU_BRAND } from "./brand";
import {
  DEFAULT_PICKUP_POLICY,
  minutesUntilPickupEnd,
  resolvePickupPolicy,
  type GiuPickupPolicy,
} from "./pickup-policy";
import type { GiuBox, GiuMerchant, GiuReservation } from "./types";

export type RefundSplit = {
  type: "full" | "late_cancel" | "no_show";
  refundVnd: number;
  noShowFeeVnd: number;
  platformFeeVnd: number;
  merchantCompensationVnd: number;
  reason: "free_window" | "late_cancel" | "no_show" | "promise_give_up";
};

function partialSplit(
  totalVnd: number,
  feeRate: number,
  reason: RefundSplit["reason"],
): RefundSplit {
  const noShowFeeVnd = Math.round(totalVnd * feeRate);
  const refundVnd = totalVnd - noShowFeeVnd;
  const platformFeeVnd = Math.round(totalVnd * GIU_BRAND.commissionRate);
  const merchantCompensationVnd = Math.max(0, noShowFeeVnd - platformFeeVnd);
  return {
    type: reason === "late_cancel" ? "late_cancel" : "no_show",
    refundVnd,
    noShowFeeVnd,
    platformFeeVnd,
    merchantCompensationVnd,
    reason,
  };
}

export function calculateRefundSplit(
  reservation: GiuReservation,
  box: GiuBox,
  merchant?: Pick<GiuMerchant, "pickupPolicy"> | null,
  now = Date.now(),
): RefundSplit {
  const policy = resolvePickupPolicy(merchant);
  const minutesToEnd = minutesUntilPickupEnd(box.pickupEnd, now);

  const zeroFee = {
    type: "full" as const,
    refundVnd: reservation.totalVnd,
    noShowFeeVnd: 0,
    platformFeeVnd: 0,
    merchantCompensationVnd: 0,
    reason: "free_window" as const,
  };

  if (
    reservation.merchantPickupPromiseUntil &&
    new Date(reservation.merchantPickupPromiseUntil).getTime() > now
  ) {
    return partialSplit(reservation.totalVnd, policy.noShowFeeRate, "promise_give_up");
  }

  if (minutesToEnd >= policy.cancelFreeBeforeMinutes) {
    return zeroFee;
  }

  if (minutesToEnd > 0) {
    return partialSplit(reservation.totalVnd, policy.lateCancelFeeRate, "late_cancel");
  }

  return partialSplit(reservation.totalVnd, policy.noShowFeeRate, "no_show");
}

export function refundSplitLabelReason(split: RefundSplit, policy: GiuPickupPolicy = DEFAULT_PICKUP_POLICY): string {
  if (split.reason === "free_window") {
    return `픽업 ${policy.cancelFreeBeforeMinutes}분 전 — 수수료 없음`;
  }
  if (split.reason === "late_cancel") {
    return `픽업 ${policy.cancelFreeBeforeMinutes}분 이내 취소 — ${Math.round(policy.lateCancelFeeRate * 100)}%`;
  }
  return `노쇼/미수령 — ${Math.round(policy.noShowFeeRate * 100)}%`;
}
