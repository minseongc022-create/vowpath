"use client";

import { useState } from "react";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  reservationId: string;
  onDone?: () => void;
};

export function MerchantPickupPromiseButton({ locale, reservationId, onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function promisePickup() {
    if (loading || done) return;
    if (!window.confirm(t(locale, "mPromisePickupConfirm"))) return;
    hapticSelect();
    setLoading(true);
    try {
      const res = await fetch(`/api/giu/reservations/${reservationId}/pickup-extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "promise" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? t(locale, "mPromisePickupFail"));
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
      <p className="text-[12px] font-bold text-giu-primary">{t(locale, "mPromisePickupDone")}</p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void promisePickup()}
      disabled={loading}
      className="giu-btn-primary giu-btn-3d w-full !py-2.5 text-[13px]"
    >
      {loading ? t(locale, "loading") : t(locale, "mPromisePickupCta")}
    </button>
  );
}
