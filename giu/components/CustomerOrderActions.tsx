"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CustomerExtensionRequestForm } from "@/giu/components/CustomerExtensionRequestForm";
import { CustomerPickupProposalReview } from "@/giu/components/CustomerPickupProposalReview";
import { NotPickedUpBanner } from "@/giu/components/NotPickedUpBanner";
import { ReservationChatButton } from "@/giu/components/ReservationChatButton";
import { telHref } from "@/giu/lib/freshness";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";
import {
  canCustomerRequestPickupChange,
  chatAllowedForStatus,
  DISPUTE_REASONS_KO,
  notPickedUpGraceActionsAvailable,
} from "@/giu/lib/order-status";
import { type GiuPickupPolicy } from "@/giu/lib/pickup-policy";
import type { GiuOrderStatus, GiuReservation } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  reservation: GiuReservation;
  displayStatus: GiuOrderStatus;
  merchantName: string;
  merchantPhone?: string;
  boxPickupStart?: string;
  boxPickupEnd?: string;
  policy: GiuPickupPolicy;
  defaultPlannedAt?: string;
};

export function CustomerOrderActions({
  locale,
  reservation,
  displayStatus,
  merchantName,
  merchantPhone,
  boxPickupStart,
  boxPickupEnd,
  policy,
  defaultPlannedAt,
}: Props) {
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<(typeof DISPUTE_REASONS_KO)[number] | "">("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const tel = merchantPhone ? telHref(merchantPhone) : "";
  const extensionStatus = reservation.extensionRequest?.status;
  const inGrace = notPickedUpGraceActionsAvailable(reservation, policy);
  const showNotPickedUp = displayStatus === "not_picked_up";
  const canChangePickup = canCustomerRequestPickupChange(reservation);
  const showChat = chatAllowedForStatus(displayStatus);

  async function submitReport() {
    if (!reportReason || reportLoading || reportDone) return;
    hapticSelect();
    setReportLoading(true);
    try {
      const res = await fetch(`/api/giu/reservations/${reservation.id}/order-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "report_dispute", reason: reportReason }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? t(locale, "orderReportFail"));
        return;
      }
      setReportDone(true);
      setReportOpen(false);
      router.refresh();
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <CustomerPickupProposalReview locale={locale} reservation={reservation} />

      {displayStatus === "payment_completed" ? (
        <p className="rounded-[14px] bg-giu-primary-soft px-3 py-2.5 text-[12px] font-semibold leading-snug text-giu-ink">
          {t(locale, "orderPaymentCompletedHint")}
        </p>
      ) : null}

      {showNotPickedUp && boxPickupStart && boxPickupEnd ? (
        <NotPickedUpBanner
          locale={locale}
          reservation={reservation}
          boxPickupStart={boxPickupStart}
          boxPickupEnd={boxPickupEnd}
          policy={policy}
        />
      ) : null}

      {inGrace && tel ? (
        <a
          href={tel}
          className="giu-btn-primary giu-btn-3d flex w-full items-center justify-center !py-2.5 text-[13px]"
        >
          {t(locale, "orderContactStore")}
        </a>
      ) : null}

      {inGrace && canChangePickup && extensionStatus !== "approved" ? (
        <CustomerExtensionRequestForm
          locale={locale}
          reservationId={reservation.id}
          canRequestInApp
          cutoffMinutes={policy.extensionRequestBeforeMinutes}
          extensionStatus={extensionStatus}
          defaultPlannedAt={defaultPlannedAt}
          ctaLabel={t(locale, "orderPickupChangeCta")}
        />
      ) : null}

      {inGrace ? (
        reportDone ? (
          <p className="rounded-[14px] bg-giu-accent-soft px-3 py-2.5 text-[12px] font-semibold text-giu-primary">
            {t(locale, "orderReportSuccess")}
          </p>
        ) : !reportOpen ? (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="giu-btn-secondary giu-btn-3d w-full !py-2.5 text-[13px]"
          >
            {t(locale, "orderReportProblem")}
          </button>
        ) : (
          <div className="space-y-2 rounded-[14px] bg-giu-bg/80 p-3 ring-1 ring-giu-border">
            <p className="text-[13px] font-bold text-giu-ink">{t(locale, "orderReportTitle")}</p>
            <div className="space-y-1.5">
              {DISPUTE_REASONS_KO.map((reason) => (
                <label
                  key={reason}
                  className={`flex cursor-pointer items-start gap-2 rounded-[12px] px-3 py-2 text-[12px] ring-1 ${
                    reportReason === reason
                      ? "bg-giu-primary-soft ring-giu-primary/30 font-semibold text-giu-ink"
                      : "bg-white ring-giu-border text-giu-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="dispute-reason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={() => setReportReason(reason)}
                    className="mt-0.5"
                  />
                  {reason}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="giu-btn-secondary flex-1 !py-2.5 text-[13px]"
              >
                {t(locale, "mCloseSheet")}
              </button>
              <button
                type="button"
                onClick={() => void submitReport()}
                disabled={!reportReason || reportLoading}
                className="giu-btn-primary giu-btn-3d flex-1 !py-2.5 text-[13px]"
              >
                {reportLoading ? t(locale, "loading") : t(locale, "orderReportSubmit")}
              </button>
            </div>
          </div>
        )
      ) : null}

      <p className="text-[11px] leading-snug text-giu-muted">{t(locale, "chatOfficialNotice")}</p>

      {showChat && merchantName ? (
        <ReservationChatButton
          locale={locale}
          reservationId={reservation.id}
          viewerRole="customer"
          peerName={merchantName}
          peerPhone={merchantPhone}
        />
      ) : null}
    </div>
  );
}
