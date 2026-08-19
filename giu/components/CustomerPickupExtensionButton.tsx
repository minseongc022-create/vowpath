"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { hapticSelect } from "@/giu/lib/haptics";
import { t, type GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  reservationId: string;
  extensionRequested?: boolean;
};

export function CustomerPickupExtensionButton({
  locale,
  reservationId,
  extensionRequested,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(Boolean(extensionRequested));

  async function requestExtension() {
    if (loading || requested) return;
    hapticSelect();
    setLoading(true);
    try {
      const res = await fetch(`/api/giu/reservations/${reservationId}/pickup-extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "request" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? t(locale, "cExtendPickupFail"));
        return;
      }
      setRequested(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (requested) {
    return (
      <p className="text-[12px] font-semibold leading-snug text-giu-primary">
        {t(locale, "cExtendPickupRequested")}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void requestExtension()}
      disabled={loading}
      className="giu-btn-secondary giu-btn-3d w-full !py-2.5 text-[13px]"
    >
      {loading ? t(locale, "loading") : t(locale, "cExtendPickupCta")}
    </button>
  );
}
