"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  reservationId: string;
  canRequestInApp: boolean;
  cutoffMinutes: number;
  extensionStatus?: "pending" | "approved" | "rejected";
  defaultPlannedAt?: string;
};

export function CustomerExtensionRequestForm({
  locale,
  reservationId,
  canRequestInApp,
  cutoffMinutes,
  extensionStatus,
  defaultPlannedAt,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [plannedPickupAt, setPlannedPickupAt] = useState(defaultPlannedAt ?? "");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading || !canRequestInApp) return;
    if (reason.trim().length < 4 || !plannedPickupAt) {
      window.alert(t(locale, "cExtendFormFill"));
      return;
    }
    hapticSelect();
    setLoading(true);
    try {
      const res = await fetch(`/api/giu/reservations/${reservationId}/pickup-extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "request", reason: reason.trim(), plannedPickupAt }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? t(locale, "cExtendPickupFail"));
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (extensionStatus === "pending") {
    return (
      <p className="rounded-[14px] bg-giu-primary-soft px-3 py-2.5 text-[12px] font-semibold leading-snug text-giu-ink">
        {t(locale, "cExtendPickupPending")}
      </p>
    );
  }

  if (extensionStatus === "approved") {
    return (
      <p className="rounded-[14px] bg-giu-accent-soft px-3 py-2.5 text-[12px] font-semibold leading-snug text-giu-primary">
        {t(locale, "cExtendPickupApproved")}
      </p>
    );
  }

  if (extensionStatus === "rejected") {
    return (
      <p className="rounded-[14px] bg-amber-50 px-3 py-2.5 text-[12px] font-semibold leading-snug text-amber-900">
        {t(locale, "cExtendPickupRejected")}
      </p>
    );
  }

  if (!canRequestInApp) {
    return (
      <p className="text-[12px] leading-snug text-giu-muted">
        {t(locale, "cExtendPickupClosed").replace("{min}", String(cutoffMinutes))}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="giu-btn-secondary giu-btn-3d w-full !py-2.5 text-[13px]"
      >
        {t(locale, "cExtendPickupCta")}
      </button>
    );
  }

  return (
    <div id="giu-extension-form" className="space-y-2 rounded-[14px] bg-giu-bg/80 p-3 ring-1 ring-giu-border">
      <p className="text-[13px] font-bold text-giu-ink">{t(locale, "cExtendFormTitle")}</p>
      <p className="text-[11px] leading-snug text-giu-muted">{t(locale, "cExtendFormHint")}</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder={t(locale, "cExtendReasonPh")}
        className="giu-input min-h-[72px] resize-none text-[13px]"
      />
      <div>
        <label className="giu-label">{t(locale, "cExtendWhenLabel")}</label>
        <input
          type="datetime-local"
          value={plannedPickupAt}
          onChange={(e) => setPlannedPickupAt(e.target.value)}
          className="giu-input text-[13px]"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="giu-btn-secondary flex-1 !py-2.5 text-[13px]"
        >
          {t(locale, "mCloseSheet")}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          className="giu-btn-primary giu-btn-3d flex-1 !py-2.5 text-[13px]"
        >
          {loading ? t(locale, "loading") : t(locale, "cExtendSubmit")}
        </button>
      </div>
    </div>
  );
}
