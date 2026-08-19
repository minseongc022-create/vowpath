"use client";

import { useState } from "react";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";
import type { GiuReservation } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  reservation: GiuReservation;
  onDone?: () => void;
};

export function MerchantPickupChangeProposal({ locale, reservation, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [plannedPickupAt, setPlannedPickupAt] = useState("");
  const [reason, setReason] = useState("");
  const [storageOk, setStorageOk] = useState(false);
  const [loading, setLoading] = useState(false);

  if ((reservation.pickupChangeCount ?? 0) >= 1) return null;
  if (reservation.merchantPickupProposal?.status === "pending") return null;

  async function submit() {
    if (!plannedPickupAt || !storageOk || loading) return;
    hapticSelect();
    setLoading(true);
    try {
      const res = await fetch(`/api/giu/reservations/${reservation.id}/pickup-extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "propose",
          plannedPickupAt,
          reason: reason.trim() || undefined,
          merchantStorageConfirmed: storageOk,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? t(locale, "mExtendActionFail"));
        return;
      }
      setOpen(false);
      onDone?.();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="giu-btn-secondary giu-btn-3d w-full !py-2.5 text-[13px]"
      >
        {t(locale, "merchantPickupChangeProposalCta")}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-[14px] bg-giu-bg/80 p-3 ring-1 ring-giu-border">
      <p className="text-[13px] font-bold text-giu-ink">{t(locale, "merchantPickupChangeProposalTitle")}</p>
      <input
        type="datetime-local"
        value={plannedPickupAt}
        onChange={(e) => setPlannedPickupAt(e.target.value)}
        className="giu-input text-[13px]"
      />
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder={t(locale, "cExtendReasonPh")}
        className="giu-input min-h-[56px] resize-none text-[13px]"
      />
      <label className="flex items-start gap-2 text-[12px] text-giu-ink">
        <input type="checkbox" checked={storageOk} onChange={(e) => setStorageOk(e.target.checked)} className="mt-0.5" />
        {t(locale, "merchantStorageConfirm")}
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="giu-btn-secondary flex-1 !py-2.5 text-[13px]">
          {t(locale, "mCloseSheet")}
        </button>
        <button
          type="button"
          disabled={!plannedPickupAt || !storageOk || loading}
          onClick={() => void submit()}
          className="giu-btn-primary giu-btn-3d flex-1 !py-2.5 text-[13px]"
        >
          {loading ? t(locale, "loading") : t(locale, "merchantPickupChangeProposalSend")}
        </button>
      </div>
    </div>
  );
}
