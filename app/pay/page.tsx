"use client";

import { useEffect, useState } from "react";
import { checkoutErrorMessage } from "@/lib/checkout-errors";
import { openPaddleCheckout } from "@/lib/paddle-checkout-client";

/**
 * Set as the Paddle "Default payment link" (Paddle > Checkout > Checkout settings).
 * Paddle appends ?_ptxn=<transactionId> to checkout.url as a fallback path.
 */
export default function PayPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const transactionId = new URLSearchParams(window.location.search).get("_ptxn");
    if (!transactionId) {
      setError("missing_transaction");
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
  }, []);

  const message = error ? checkoutErrorMessage(error) : "Loading checkout…";

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 px-4">
      <p className="max-w-md text-center text-brand-100">{message}</p>
    </div>
  );
}
