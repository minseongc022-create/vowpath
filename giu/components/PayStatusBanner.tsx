"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGiuLocale } from "./GiuLocaleProvider";

/** Shows pay=? banners on hop list after failed/cancelled checkout. */
export function PayStatusBanner() {
  const searchParams = useSearchParams();
  const { tt } = useGiuLocale();
  const pay = searchParams.get("pay");

  if (!pay) return null;

  const message =
    pay === "failed" || pay === "amount_mismatch"
      ? tt("payBannerFailed")
      : pay === "invalid"
        ? tt("payBannerInvalid")
        : pay === "cancelled"
          ? tt("payBannerCancelled")
          : pay === "error"
            ? tt("payBannerError")
            : null;

  if (!message) return null;

  return (
    <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      {message}
    </div>
  );
}

/** Polls reservation until paid after Lemon Squeezy / VNPay return. */
export function ReservationPaymentPoller({
  reservationId,
  pending,
}: {
  reservationId: string;
  pending: boolean;
}) {
  const router = useRouter();
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const id = window.setInterval(() => {
      setTicks((t) => t + 1);
      router.refresh();
    }, 4000);
    return () => window.clearInterval(id);
  }, [pending, reservationId, router]);

  if (!pending) return null;

  return (
    <p className="text-xs text-giu-muted" aria-live="polite">
      {ticks > 0 ? `… ${ticks * 4}s` : null}
    </p>
  );
}
