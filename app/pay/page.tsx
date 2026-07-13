"use client";

import { useEffect, useState } from "react";
import { checkoutErrorMessage, checkoutErrorMessageKo } from "@/lib/checkout-errors";
import { isEnglishUi } from "@/lib/locale";
import { openPaddleCheckout } from "@/lib/paddle-checkout-client";

/**
 * Set as the Paddle "Default payment link" (Paddle > Checkout > Checkout settings).
 * Paddle appends ?_ptxn=<transactionId> to checkout.url as a fallback path.
 */
export default function PayPage() {
  const [error, setError] = useState<string | null>(null);
  const en = isEnglishUi();

  useEffect(() => {
    const transactionId = new URLSearchParams(window.location.search).get("_ptxn");
    if (!transactionId) {
      setError(en ? "missing_transaction" : "missing_transaction");
      return;
    }

    let cancelled = false;
    void openPaddleCheckout(transactionId).catch((e) => {
      if (cancelled) return;
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? String((e as { code?: string }).code)
          : "unavailable";
      setError(code);
    });

    return () => {
      cancelled = true;
    };
  }, [en]);

  const message = error
    ? en
      ? checkoutErrorMessage(error)
      : checkoutErrorMessageKo(error)
    : en
      ? "Loading checkout…"
      : "결제창을 불러오는 중…";

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 px-4">
      <p className="max-w-md text-center text-brand-100">{message}</p>
    </div>
  );
}
