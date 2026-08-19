"use client";

import { useState } from "react";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  reservationId: string;
  onDone?: () => void;
};

export function MerchantPickupExtensionButton({ locale, reservationId, onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function grant() {
    if (loading || done) return;
    if (!window.confirm(t(locale, "mExtendPickupConfirm"))) return;
    hapticSelect();
    setLoading(true);
    try {
      const res = await fetch(`/api/giu/reservations/${reservationId}/pickup-extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "grant" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? t(locale, "mExtendPickupFail"));
        return;
      }
      setDone(true);
      onDone?.();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-[12px] font-bold text-giu-primary">{t(locale, "mExtendPickupDone")}</p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void grant()}
      disabled={loading}
      className="giu-btn-primary giu-btn-3d w-full !py-2.5 text-[13px]"
    >
      {loading ? t(locale, "loading") : t(locale, "mExtendPickupCta")}
    </button>
  );
}
