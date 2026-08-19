"use client";

import { useMemo } from "react";
import {
  formatPaymentStatusLocale,
  formatReservationStatusLocale,
} from "@/giu/lib/box-ux";
import { formatPickupWindowWithDate } from "@/giu/lib/format";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuI18nKey, type GiuLocale } from "@/giu/lib/i18n";
import {
  buildCustomerTimeline,
  getCustomerReservations,
  type CustomerTimelineKind,
} from "@/giu/lib/merchant-customer-history";
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

function eventLabel(locale: GiuLocale, kind: CustomerTimelineKind): string {
  const key: Record<CustomerTimelineKind, GiuI18nKey> = {
    order: "mCustEventOrder",
    paid: "mCustEventPaid",
    extension_request: "mCustEventExtendReq",
    extension_approved: "mCustEventExtendOk",
    extension_rejected: "mCustEventExtendNo",
    pickup_done: "mCustEventPickup",
    refund: "mCustEventRefund",
    no_show: "mCustEventNoShow",
    expired: "mCustEventExpired",
    cancelled: "mCustEventCancel",
  };
  return t(locale, key[kind]);
}

function eventTone(kind: CustomerTimelineKind): string {
  switch (kind) {
    case "extension_request":
      return "text-amber-800 bg-amber-50 ring-amber-200/60";
    case "extension_approved":
    case "pickup_done":
    case "paid":
      return "text-emerald-800 bg-emerald-50 ring-emerald-200/60";
    case "extension_rejected":
    case "expired":
    case "no_show":
      return "text-amber-900 bg-amber-50 ring-amber-200/60";
    case "refund":
    case "cancelled":
      return "text-rose-800 bg-rose-50 ring-rose-200/60";
    default:
      return "text-giu-ink bg-giu-bg ring-giu-border";
  }
}

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
  const customerOrders = useMemo(() => {
    if (!customerId) return [];
    return getCustomerReservations(reservations, merchant.id, customerId);
  }, [customerId, merchant.id, reservations]);

  const customer = customerOrders[0];
  const timeline = useMemo(
    () => buildCustomerTimeline(customerOrders, boxMap),
    [customerOrders, boxMap],
  );

  const stats = useMemo(() => {
    const completed = customerOrders.filter((r) => r.status === "da_lay").length;
    const refunded = customerOrders.filter(
      (r) => r.paymentStatus === "refunded" || r.refundedAt,
    ).length;
    const pendingExt = customerOrders.some((r) => r.extensionRequest?.status === "pending");
    const spent = customerOrders
      .filter((r) => r.status === "da_lay" && r.paymentStatus === "paid")
      .reduce((s, r) => s + r.totalVnd, 0);
    return { completed, refunded, pendingExt, spent, total: customerOrders.length };
  }, [customerOrders]);

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
        <div>
          <h2 id={titleId} className="text-[18px] font-extrabold text-giu-ink">
            {customer.customerName}
          </h2>
          <p className="mt-0.5 text-[13px] text-giu-muted">{customer.customerPhone}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-giu-muted">
            {t(locale, "mCustDetailSub")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[12px] bg-giu-bg px-3 py-2.5 ring-1 ring-giu-border">
            <p className="text-[10px] font-bold text-giu-muted">{t(locale, "mCustStatOrders")}</p>
            <p className="text-[20px] font-extrabold text-giu-ink">{stats.total}</p>
          </div>
          <div className="rounded-[12px] bg-giu-accent-soft px-3 py-2.5">
            <p className="text-[10px] font-bold text-giu-primary">{t(locale, "mCustStatPickups")}</p>
            <p className="text-[20px] font-extrabold text-giu-ink">{stats.completed}</p>
          </div>
          <div className="rounded-[12px] bg-giu-bg px-3 py-2.5 ring-1 ring-giu-border">
            <p className="text-[10px] font-bold text-giu-muted">{t(locale, "mCustStatRefunds")}</p>
            <p className="text-[20px] font-extrabold text-giu-ink">{stats.refunded}</p>
          </div>
          <div className="rounded-[12px] bg-giu-primary-soft px-3 py-2.5">
            <p className="text-[10px] font-bold text-giu-primary">{t(locale, "mCustStatSpent")}</p>
            <p className="text-[15px] font-extrabold leading-tight text-giu-ink">{money(stats.spent)}</p>
          </div>
        </div>

        {stats.pendingExt ? (
          <p className="giu-info-banner text-[12px]">{t(locale, "mCustPendingExtend")}</p>
        ) : null}

        <section className="space-y-2">
          <h3 className="text-[14px] font-bold text-giu-ink">{t(locale, "mCustOrderHistory")}</h3>
          <ul className="space-y-2.5">
            {customerOrders.map((r) => {
              const box = boxMap.get(r.boxId);
              const net = r.totalVnd - r.platformFeeVnd;
              const awaiting =
                r.paymentStatus === "paid" &&
                (r.status === "giu_cho" || r.status === "het_han");
              return (
                <li key={r.id} className="giu-card-flat p-3 ring-1 ring-giu-border">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-giu-ink">
                        {box?.title ?? t(locale, "mOrderProduct")}
                      </p>
                      {box ? (
                        <p className="mt-0.5 text-[11px] text-giu-muted">
                          {formatPickupWindowWithDate(box.pickupStart, box.pickupEnd, "kr")}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[12px] text-giu-muted">
                        {money(r.totalVnd)} · {t(locale, "mOrderNet")} {money(net)}
                      </p>
                      <p className="text-[12px] text-giu-muted">
                        {formatPaymentStatusLocale(r.paymentStatus, locale)} ·{" "}
                        {formatReservationStatusLocale(r.status, locale)}
                      </p>
                    </div>
                    {r.extensionRequest?.status === "pending" ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">
                        {t(locale, "mCustBadgeExtend")}
                      </span>
                    ) : null}
                  </div>
                  {awaiting && box ? (
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
                  {r.paymentStatus === "paid" &&
                  (r.status === "giu_cho" || r.status === "da_lay" || r.status === "het_han") ? (
                    <div className="mt-2">
                      <ReservationChatButton
                        locale={locale}
                        reservationId={r.id}
                        viewerRole="merchant"
                        peerName={r.customerName}
                        peerPhone={r.customerPhone}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-[14px] font-bold text-giu-ink">{t(locale, "mCustActivity")}</h3>
          {timeline.length === 0 ? (
            <p className="text-[13px] text-giu-muted">{t(locale, "mCustActivityEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {timeline.map((ev) => (
                <li
                  key={ev.id}
                  className={`rounded-[14px] px-3 py-2.5 ring-1 ${eventTone(ev.kind)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-bold">{eventLabel(locale, ev.kind)}</p>
                    <time className="shrink-0 text-[10px] font-semibold opacity-70">
                      {new Date(ev.at).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  {ev.productTitle ? (
                    <p className="mt-0.5 text-[11px] font-semibold opacity-90">{ev.productTitle}</p>
                  ) : null}
                  {ev.detail ? (
                    <p className="mt-0.5 text-[11px] leading-snug opacity-85">{ev.detail}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </GiuBottomSheet>
  );
}
