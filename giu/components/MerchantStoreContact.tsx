"use client";

import { useCallback, useEffect, useState } from "react";
import { ReservationChatButton } from "@/giu/components/ReservationChatButton";
import { telHref } from "@/giu/lib/freshness";
import { chatCallLabel, chatOpenLabel, t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { isActiveCustomerOrder } from "@/giu/lib/order-status";
import type { GiuReservation } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  merchantId: string;
  merchantName: string;
  merchantPhone?: string;
};

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 4h3l1.2 3.6-1.8 1.2a12.5 12.5 0 006.5 6.5l1.2-1.8L20 14.5V18a1.5 1.5 0 01-1.5 1.5C9.8 19.5 4.5 14.2 4.5 5.5A1.5 1.5 0 016 4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MerchantStoreContact({
  locale,
  merchantId,
  merchantName,
  merchantPhone,
}: Props) {
  const [reservation, setReservation] = useState<GiuReservation | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/giu/reservations", { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        setReservation(null);
        return;
      }
      const data = (await res.json()) as { reservations?: GiuReservation[] };
      const match =
        data.reservations?.find(
          (r) => r.merchantId === merchantId && isActiveCustomerOrder(r),
        ) ?? null;
      setReservation(match);
    } catch {
      setReservation(null);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const tel = merchantPhone ? telHref(merchantPhone) : "";

  if (loading) {
    return (
      <p className="text-center text-[12px] text-giu-muted">{t(locale, "loading")}</p>
    );
  }

  if (reservation) {
    return (
      <ReservationChatButton
        locale={locale}
        reservationId={reservation.id}
        viewerRole="customer"
        peerName={merchantName}
        peerPhone={merchantPhone}
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[12px] leading-relaxed text-giu-muted">{t(locale, "chatNeedOrder")}</p>
      <div className="flex w-full items-stretch gap-2.5">
        <span className="giu-btn giu-btn-3d flex min-h-[48px] min-w-0 flex-1 items-center justify-center rounded-[14px] bg-giu-bg px-4 py-3 text-[13px] font-bold text-giu-muted ring-1 ring-giu-border">
          {chatOpenLabel(locale, "customer")}
        </span>
        {tel ? (
          <a
            href={tel}
            className="giu-btn giu-btn-3d flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] bg-white text-giu-primary ring-2 ring-giu-primary/20"
            aria-label={chatCallLabel(locale, "customer")}
          >
            <PhoneIcon />
          </a>
        ) : null}
      </div>
    </div>
  );
}
