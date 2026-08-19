"use client";

import { useMemo } from "react";
import {
  formatPaymentStatusLocale,
  formatReservationStatusLocale,
} from "@/giu/lib/box-ux";
import { formatPickupWindowWithDate } from "@/giu/lib/format";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";
import {
  customerVisitLabel,
  getCustomerReservations,
} from "@/giu/lib/merchant-customer-history";
import {
  resolveDisplayReservationStatus,
  resolvePickupPolicy,
} from "@/giu/lib/pickup-policy";
import type { GiuBox, GiuMerchant, GiuReservation } from "@/giu/lib/types";
import { GiuBottomSheet } from "./GiuBottomSheet";
import { MerchantExtensionReview } from "./MerchantExtensionReview";
import { ReservationChatButton } from "./ReservationChatButton";

type Props = {
  locale: GiuLocale;
  open: boolean;
  customerId: string | null;
  onClose: () => void;
  reservations: GiuReservation[];
  boxMap: Map<string, GiuBox>;
  money: (n: number) => string;
  merchant: GiuMerchant;
  onChanged: () => void;
};

export function MerchantCustomerDetailSheet({
  locale,
  open,
  customerId,
  onClose,
  reservations,
  boxMap,
  money,
  merchant,
  onChanged,
}: Props) {
  const policy = resolvePickupPolicy(merchant);

  const customerOrders = useMemo(() => {
    if (!customerId) return [];
    return getCustomerReservations(reservations, merchant.id, customerId);
  }, [customerId, merchant.id, reservations]);

  const customer = customerOrders[0];

  const chatReservation = useMemo(() => {
    const active = customerOrders.find(
      (r) =>
        r.paymentStatus === "paid" &&
        (r.status === "giu_cho" || r.status === "het_han"),
    );
    return active ?? customerOrders[0] ?? null;
  }, [customerOrders]);

  const visitLabel = useMemo(
    () => customerVisitLabel(customerOrders, locale),
    [customerOrders, locale],
  );

  const titleId = "giu-merchant-customer-sheet-title";
  if (!customerId || !customer) return null;

  return (
    <GiuBottomSheet
      open={open}
      onClose={() => {
        hapticSelect();
        onClose();
      }}
      dismissLabel={t(locale, "mCloseSheet")}
      ariaLabelledBy={titleId}
    >
      <div className="max-h-[85vh] space-y-4 overflow-y-auto p-4 pb-8">
        <div className="space-y-3">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id={titleId} className="text-[18px] font-extrabold text-giu-ink">
                  {customer.customerName}
                </h2>
                <p className="mt-0.5 text-[13px] text-giu-muted">{customer.customerPhone}</p>
              </div>
              <span className="rounded-full bg-giu-primary-soft px-3 py-1 text-[12px] font-bold text-giu-primary">
                {visitLabel}
              </span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-giu-muted">
              {t(locale, "mCustDetailSub")}
            </p>
          </div>

          {chatReservation ? (
            <ReservationChatButton
              locale={locale}
              reservationId={chatReservation.id}
              viewerRole="merchant"
              peerName={customer.customerName}
              peerPhone={customer.customerPhone}
            />
          ) : null}
        </div>

        <section className="space-y-2">
          <h3 className="text-[14px] font-bold text-giu-ink">{t(locale, "mCustOrderHistory")}</h3>
          <ul className="space-y-2">
            {customerOrders.map((r) => {
              const box = boxMap.get(r.boxId);
              const shown = resolveDisplayReservationStatus(r, box?.pickupEnd, policy);
              const awaiting =
                r.paymentStatus === "paid" && (shown === "giu_cho" || shown === "het_han");
              return (
                <li key={r.id} className="giu-card-flat p-3 ring-1 ring-giu-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-giu-ink">
                        {box?.title ?? t(locale, "mOrderProduct")}
                      </p>
                      {box ? (
                        <p className="mt-0.5 text-[11px] text-giu-muted">
                          {formatPickupWindowWithDate(box.pickupStart, box.pickupEnd, "kr")}
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-[12px] font-semibold text-giu-ink">
                        {money(r.totalVnd)}
                      </p>
                      <p className="text-[11px] text-giu-muted">
                        {formatPaymentStatusLocale(r.paymentStatus, locale)} ·{" "}
                        {formatReservationStatusLocale(shown, locale)}
                      </p>
                    </div>
                    {r.extensionRequest?.status === "pending" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        {t(locale, "mCustBadgeExtend")}
                      </span>
                    ) : null}
                  </div>
                  {awaiting && box && r.extensionRequest?.status === "pending" ? (
                    <div className="mt-2">
                      <MerchantExtensionReview
                        locale={locale}
                        reservation={r}
                        boxPickupStart={box.pickupStart}
                        boxPickupEnd={box.pickupEnd}
                        onDone={onChanged}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </GiuBottomSheet>
  );
}
