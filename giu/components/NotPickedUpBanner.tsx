"use client";

import { formatPickupDate, formatPickupWindow } from "@/giu/lib/format";
import { t, type GiuLocale } from "@/giu/lib/i18n";
import {
  isWithinNotPickedUpGrace,
  notPickedUpGraceEndsAtMs,
  type GiuPickupPolicy,
} from "@/giu/lib/pickup-policy";
import type { GiuReservation } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  reservation: GiuReservation;
  boxPickupStart: string;
  boxPickupEnd: string;
  policy: GiuPickupPolicy;
};

export function NotPickedUpBanner({
  locale,
  reservation,
  boxPickupStart,
  boxPickupEnd,
  policy,
}: Props) {
  const inGrace = isWithinNotPickedUpGrace(reservation, policy);
  const graceEnd = reservation.notPickedUpAt
    ? new Date(notPickedUpGraceEndsAtMs(reservation.notPickedUpAt, policy))
    : null;

  return (
    <div className="space-y-2 rounded-[14px] bg-amber-50 px-3 py-3 ring-1 ring-amber-200">
      <p className="text-[14px] font-bold text-amber-950">{t(locale, "notPickedUpTitle")}</p>
      <p className="text-[13px] leading-snug text-amber-900">{t(locale, "notPickedUpQuestion")}</p>
      <p className="text-[12px] text-amber-900/90">
        {t(locale, "pickupWindowLabel")}{" "}
        <span className="font-semibold">
          {formatPickupDate(boxPickupStart)} · {formatPickupWindow(boxPickupStart, boxPickupEnd, "kr")}
        </span>
      </p>
      {inGrace && graceEnd ? (
        <p className="text-[12px] font-semibold text-amber-900">
          {t(locale, "notPickedUpGraceUntil").replace(
            "TIME",
            graceEnd.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true }),
          )}
        </p>
      ) : null}
    </div>
  );
}
