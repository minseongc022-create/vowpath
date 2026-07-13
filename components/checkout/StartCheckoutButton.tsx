"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES, type PlanId } from "@/lib/constants";
import { checkoutErrorMessage, checkoutErrorMessageKo } from "@/lib/checkout-errors";
import { getStartedHref } from "@/lib/checkout-urls";
import { isEnglishUi } from "@/lib/locale";
import { startPlanCheckout } from "@/lib/paddle-checkout-client";

type CheckoutStatus = {
  checkoutEnabled: boolean;
  mode: string;
};

type Props = {
  plan?: PlanId;
  children: React.ReactNode;
  className?: string;
  directCheckout?: boolean;
  disabled?: boolean;
};

export function StartCheckoutButton({
  plan = "unlimited",
  children,
  className = "",
  directCheckout = true,
  disabled = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const en = isEnglishUi();

  useEffect(() => {
    void fetch("/api/checkout/status")
      .then((r) => r.json())
      .then((d: CheckoutStatus) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  if (!directCheckout) {
    return (
      <Link href={getStartedHref(plan)} className={className}>
        {children}
      </Link>
    );
  }

  if (status && !status.checkoutEnabled) {
    return (
      <Link href={ROUTES.signup} className={className}>
        {children}
      </Link>
    );
  }

  async function onClick() {
    setError(null);
    setBusy(true);
    try {
      await startPlanCheckout(plan);
    } catch (e) {
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? String((e as { code?: string }).code)
          : "unavailable";
      setError(en ? checkoutErrorMessage(code) : checkoutErrorMessageKo(code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={disabled || busy || status === null}
        className={className}
      >
        {busy
          ? en
            ? "Opening checkout…"
            : "결제창 여는 중…"
          : status === null
            ? en
              ? "Loading…"
              : "불러오는 중…"
            : children}
      </button>
      {error ? (
        <span className="text-sm font-normal text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
