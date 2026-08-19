"use client";

import { useState } from "react";
import { formatPickupWindow, formatPickupDate } from "@/giu/lib/format";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";
import type { GiuReservation } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  reservation: GiuReservation;
  boxPickupStart?: string;
  boxPickupEnd?: string;
  onDone?: () => void;
};

export function MerchantExtensionReview({
  locale,
  reservation,
  boxPickupStart,
  boxPickupEnd,
  onDone,
}: Props) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const req = reservation.extensionRequest;

  if (!req || req.status !== "pending") return null;

  async function act(action: "approve" | "reject") {
    if (loading) return;
    const note =
      action === "reject"
        ? window.prompt(t(locale, "mExtendRejectNotePh"), t(locale, "mExtendRejectDefault")) ?? ""
        : undefined;
    if (action === "reject" && note === null) return;
    if (action === "approve" && !window.confirm(t(locale, "mExtendApproveConfirm"))) return;

    hapticSelect();
    setLoading(action);
    try {
      const res = await fetch(`/api/giu/reservations/${reservation.id}/pickup-extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, note: note || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? t(locale, "mExtendActionFail"));
        return;
      }
      onDone?.();
    } finally {
      setLoading(null);
    }
  }

  const planned = new Date(req.plannedPickupAt).toLocaleString("ko-KR");

  return (
    <div className="mt-2 space-y-2 rounded-[14px] border border-amber-200 bg-amber-50/80 p-3">
      <p className="text-[12px] font-bold text-amber-900">{t(locale, "mExtendPendingTitle")}</p>
      {boxPickupStart && boxPickupEnd ? (
        <p className="text-[11px] text-amber-900/80">
          {t(locale, "mOrderProduct")}: {formatPickupDate(boxPickupStart)} ·{" "}
          {formatPickupWindow(boxPickupStart, boxPickupEnd, "kr")}
        </p>
      ) : null}
      <p className="text-[11px] leading-snug text-amber-950">
        <span className="font-semibold">{t(locale, "cExtendReasonLabel")}</span> {req.reason}
      </p>
      <p className="text-[11px] leading-snug text-amber-950">
        <span className="font-semibold">{t(locale, "cExtendWhenLabel")}</span> {planned}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={Boolean(loading)}
          onClick={() => void act("approve")}
          className="giu-btn-primary giu-btn-3d flex-1 !py-2.5 text-[13px]"
        >
          {loading === "approve" ? t(locale, "loading") : t(locale, "mExtendApproveCta")}
        </button>
        <button
          type="button"
          disabled={Boolean(loading)}
          onClick={() => void act("reject")}
          className="giu-btn-secondary giu-btn-3d flex-1 !py-2.5 text-[13px]"
        >
          {loading === "reject" ? t(locale, "loading") : t(locale, "mExtendRejectCta")}
        </button>
      </div>
    </div>
  );
}
