"use client";

import {
  formatPaymentStatusLocale,
  formatReservationStatusLocale,
} from "@/giu/lib/box-ux";
import { formatPickupWindowWithDate } from "@/giu/lib/format";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";
import type { GiuBox, GiuReservation } from "@/giu/lib/types";
import { MerchantConfirmOrderButton } from "./MerchantConfirmOrderButton";
import { MerchantExtensionReview } from "./MerchantExtensionReview";
import { ReservationChatButton } from "./ReservationChatButton";

type Props = {
  locale: GiuLocale;
  reservation: GiuReservation;
  box?: GiuBox;
  expanded: boolean;
  onToggle: () => void;
  money: (n: number) => string;
  shownStatus: GiuReservation["status"];
  mode: "reserved" | "delivered";
  onChanged: () => void;
  highlight?: boolean;
};

export function MerchantOrderRow({
  locale,
  reservation: r,
  box,
  expanded,
  onToggle,
  money,
  shownStatus,
  mode,
  onChanged,
  highlight,
}: Props) {
  const net = r.totalVnd - r.platformFeeVnd;

  return (
    <li
      id={`giu-order-${r.id}`}
      className={`giu-card-flat overflow-hidden ring-1 ${
        highlight ? "ring-2 ring-giu-primary" : "ring-giu-border"
      }`}
    >
      <button
        type="button"
        onClick={() => {
          hapticSelect();
          onToggle();
        }}
        className="flex w-full items-center justify-between gap-3 p-3 text-left transition active:bg-giu-bg/60"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-giu-ink">{r.customerName}</p>
          <p className="text-[13px] text-giu-muted">{r.customerPhone}</p>
          {!expanded ? (
            <p className="mt-0.5 text-[11px] text-giu-muted">{t(locale, "mOrderTapDetail")}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 text-[11px] font-bold text-giu-muted transition ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          ›
        </span>
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-giu-border/60 px-3 pb-3 pt-2">
          <p className="text-[14px] font-bold text-giu-ink">
            {box?.title ?? t(locale, "mOrderProduct")}
          </p>
          {box ? (
            <p className="text-[11px] text-giu-muted">
              {formatPickupWindowWithDate(box.pickupStart, box.pickupEnd, "kr")}
            </p>
          ) : null}
          <p className="text-[13px] font-semibold text-giu-ink">
            {money(r.totalVnd)}
            {mode === "delivered" ? (
              <span className="ml-1 text-[11px] font-medium text-giu-primary">
                · {t(locale, "mOrderNet")} {money(net)}
              </span>
            ) : null}
          </p>
          <p className="text-[11px] text-giu-muted">
            {formatPaymentStatusLocale(r.paymentStatus, locale)} ·{" "}
            {formatReservationStatusLocale(shownStatus, locale)}
          </p>
          {mode === "delivered" && r.settledAt ? (
            <p className="text-[11px] text-giu-muted">
              {t(locale, "mDeliveredAt")}{" "}
              {new Date(r.settledAt).toLocaleString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : null}
          {mode === "reserved" && r.status === "payment_completed" ? (
            <MerchantConfirmOrderButton
              locale={locale}
              reservationId={r.id}
              onDone={onChanged}
            />
          ) : null}
          {mode === "reserved" &&
          r.extensionRequest?.status === "pending" &&
          box ? (
            <MerchantExtensionReview
              locale={locale}
              reservation={r}
              boxPickupStart={box.pickupStart}
              boxPickupEnd={box.pickupEnd}
              onDone={onChanged}
            />
          ) : null}
          {mode === "reserved" && r.paymentStatus === "paid" ? (
            <ReservationChatButton
              locale={locale}
              reservationId={r.id}
              viewerRole="merchant"
              peerName={r.customerName}
              peerPhone={r.customerPhone}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
