"use client";

import { formatReservationStatusLocale } from "@/giu/lib/box-ux";
import { t, type GiuLocale } from "@/giu/lib/i18n";
import { resolveDisplayReservationStatus, type GiuPickupPolicy } from "@/giu/lib/pickup-policy";
import type { GiuReservation } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  reservation: GiuReservation;
  boxPickupEnd?: string;
  policy?: GiuPickupPolicy;
};

export function MerchantOrderStatusBadge({ locale, reservation, boxPickupEnd, policy }: Props) {
  const displayStatus = resolveDisplayReservationStatus(
    reservation,
    boxPickupEnd,
    policy,
  );

  if (displayStatus === "het_han") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
        {t(locale, "statusHetHan")}
      </span>
    );
  }
  if (displayStatus === "giu_cho" && reservation.paymentStatus === "paid") {
    return (
      <span className="rounded-full bg-giu-primary-soft px-2.5 py-1 text-[11px] font-bold text-giu-primary">
        {t(locale, "statusGiuCho")}
      </span>
    );
  }
  if (displayStatus === "da_lay") {
    return (
      <span className="rounded-full bg-giu-accent-soft px-2.5 py-1 text-[11px] font-bold text-giu-primary">
        {t(locale, "mPickupDone")}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-giu-bg px-2.5 py-1 text-[11px] font-semibold text-giu-muted">
      {formatReservationStatusLocale(displayStatus, locale)}
    </span>
  );
}
