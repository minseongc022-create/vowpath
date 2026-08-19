"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  reservationId: string;
  onDone?: () => void;
};

export function MerchantConfirmOrderButton({ locale, reservationId, onDone }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function confirm() {
    if (loading || done) return;
    if (!window.confirm(t(locale, "mConfirmOrderConfirm"))) return;
    hapticSelect();
    setLoading(true);
    try {
      const res = await fetch(`/api/giu/reservations/${reservationId}/order-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "confirm" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? t(locale, "mExtendActionFail"));
        return;
      }
      setDone(true);
      onDone?.();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-[14px] bg-giu-accent-soft px-3 py-2.5 text-[12px] font-semibold text-giu-primary">
        {t(locale, "mConfirmOrderDone")}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void confirm()}
      disabled={loading}
      className="giu-btn-primary giu-btn-3d w-full !py-2.5 text-[13px]"
    >
      {loading ? t(locale, "loading") : t(locale, "mConfirmOrderCta")}
    </button>
  );
}
