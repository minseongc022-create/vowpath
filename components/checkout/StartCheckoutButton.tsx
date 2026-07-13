"use client";

import { useState } from "react";
import Link from "next/link";
import { IS_BETA } from "@/lib/beta";
import { ROUTES, type PlanId } from "@/lib/constants";
import { checkoutErrorMessage, checkoutErrorMessageKo } from "@/lib/checkout-errors";
import { getStartedHref } from "@/lib/checkout-urls";
import { isEnglishUi } from "@/lib/locale";
import { startPlanCheckout } from "@/lib/paddle-checkout-client";

type Props = {
  plan?: PlanId;
  children: React.ReactNode;
  className?: string;
  /** When false, link to /get-started instead of opening checkout (marketing default). */
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
  const en = isEnglishUi();

  if (IS_BETA || !directCheckout) {
    const href = IS_BETA ? ROUTES.signup : getStartedHref(plan);
    return (
      <Link href={href} className={className}>
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
        disabled={disabled || busy}
        className={className}
      >
        {busy ? (en ? "Opening checkout…" : "결제창 여는 중…") : children}
      </button>
      {error ? (
        <span className="text-sm font-normal text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
