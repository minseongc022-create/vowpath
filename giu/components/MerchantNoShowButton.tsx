"use client";

import { useState } from "react";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  reservationId: string;
  onDone?: () => void;
};

export function MerchantNoShowButton({ locale, reservationId, onDone }: Props) {
  const [loading, setLoading] = useState(false);

  async function markNoShow() {
    if (loading) return;
    if (!window.confirm(t(locale, "mNoShowConfirm"))) return;
    hapticSelect();
    setLoading(true);
    try {
      const res = await fetch(`/api/giu/reservations/${reservationId}/pickup-extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "mark-no-show" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? t(locale, "mNoShowFail"));
        return;
      }
      onDone?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void markNoShow()}
      disabled={loading}
      className="giu-btn-secondary giu-btn-3d w-full !py-2.5 text-[13px]"
    >
      {loading ? t(locale, "loading") : t(locale, "mNoShowCta")}
    </button>
  );
}
