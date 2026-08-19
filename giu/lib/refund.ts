import { GIU_BRAND } from "./brand";
import type { GiuBox, GiuReservation } from "./types";

/** Share of order total kept when customer cancels after pickup window starts (no-show). */
export const GIU_NO_SHOW_FEE_RATE = 0.35;

export type RefundSplit = {
  type: "full" | "partial";
  refundVnd: number;
  noShowFeeVnd: number;
  platformFeeVnd: number;
  merchantCompensationVnd: number;
};

export function calculateRefundSplit(
  reservation: GiuReservation,
  box: GiuBox,
  now = Date.now(),
): RefundSplit {
  const zeroFee = {
    platformFeeVnd: 0,
    merchantCompensationVnd: 0,
  };

  if (reservation.status === "het_han") {
    const extended = Boolean(reservation.pickupExtendedAt);
    const extensionExpired =
      extended && new Date(reservation.expiresAt).getTime() < now;
    if (!extended || !extensionExpired) {
      return {
        type: "full",
        refundVnd: reservation.totalVnd,
        noShowFeeVnd: 0,
        ...zeroFee,
      };
    }
  }

  const pickupStart = new Date(box.pickupStart).getTime();
  if (now < pickupStart && reservation.status === "giu_cho") {
    return {
      type: "full",
      refundVnd: reservation.totalVnd,
      noShowFeeVnd: 0,
      ...zeroFee,
    };
  }

  const noShowFeeVnd = Math.round(reservation.totalVnd * GIU_NO_SHOW_FEE_RATE);
  const refundVnd = reservation.totalVnd - noShowFeeVnd;
  const platformFeeVnd = Math.round(reservation.totalVnd * GIU_BRAND.commissionRate);
  const merchantCompensationVnd = Math.max(0, noShowFeeVnd - platformFeeVnd);

  return {
    type: "partial",
    refundVnd,
    noShowFeeVnd,
    platformFeeVnd,
    merchantCompensationVnd,
  };
}
