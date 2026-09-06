"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatVnd } from "@/giu/lib/format";
import type { RefundSplit } from "@/giu/lib/refund";
import { useGiuLocale } from "./GiuLocaleProvider";

type Props = {
  reservationId: string;
};

export function RefundReservationButton({ reservationId }: Props) {
  const router = useRouter();
  const { tt } = useGiuLocale();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<RefundSplit | null>(null);
  const [previewError, setPreviewError] = useState("");

  const loadPreview = useCallback(async () => {
    setPreviewError("");
    try {
      const res = await fetch(`/api/giu/reservations/${reservationId}?refundPreview=1`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as { refundPreview?: RefundSplit; error?: string };
      if (!res.ok || !data.refundPreview) {
        setPreviewError(data.error ?? tt("refundPreviewFail"));
        return;
      }
      setPreview(data.refundPreview);
    } catch {
      setPreviewError(tt("refundPreviewFail"));
    }
  }, [reservationId, tt]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function requestRefund() {
    if (!preview) return;
    const message =
      preview.type === "full"
        ? tt("refundConfirmFull").replace("AMOUNT", formatVnd(preview.refundVnd))
        : tt("refundConfirmPartial")
            .replace("REFUND", formatVnd(preview.refundVnd))
            .replace("FEE", formatVnd(preview.noShowFeeVnd));
    if (!window.confirm(message)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/giu/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        window.alert(data.error ?? tt("refundFail"));
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (previewError) {
    return <p className="text-[12px] text-giu-muted">{previewError}</p>;
  }

  if (!preview) {
    return <p className="text-[12px] text-giu-muted">{tt("loading")}</p>;
  }

  const hint =
    preview.reason === "free_window"
      ? tt("refundFullHint").replace("{min}", "60")
      : preview.reason === "late_cancel"
        ? tt("refundLateCancelHint")
            .replace("{freeMin}", "60")
            .replace("{feePct}", "20")
            .replace("REFUND", formatVnd(preview.refundVnd))
        : tt("refundNoShowHint")
            .replace("{feePct}", "35")
            .replace("REFUND", formatVnd(preview.refundVnd));

  return (
    <div className="space-y-2 rounded-[14px] bg-giu-bg/70 p-3 ring-1 ring-giu-border">
      <p className="text-[13px] font-bold text-giu-ink">{tt("refundTitle")}</p>
      <p className="text-[12px] leading-relaxed text-giu-muted">{hint}</p>
      <button
        type="button"
        onClick={() => void requestRefund()}
        disabled={loading}
        className="giu-btn-secondary giu-btn-3d w-full !py-2.5 text-[13px]"
      >
        {loading ? tt("canceling") : tt("refundCta")}
      </button>
    </div>
  );
}
