"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/constants";
import { trialHardCutoff } from "@/lib/billing-cohort";
import { StartCheckoutButton } from "@/components/checkout/StartCheckoutButton";

type BillingStatus = {
  entitled: boolean;
  beta: boolean;
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
};

function ceilDays(ms: number): number {
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function TrialForwardingBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: BillingStatus | null) => setStatus(d))
      .catch(() => undefined);
  }, []);

  if (!status || status.beta || status.subscriptionStatus === "active") return null;
  if (status.subscriptionStatus !== "trialing" || !status.trialEndsAt) return null;

  const now = Date.now();
  const end = new Date(status.trialEndsAt).getTime();
  const graceEnd = trialHardCutoff(status.trialEndsAt);

  if (now >= end && now < graceEnd) {
    const graceLeft = ceilDays(graceEnd - now);
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
        <p className="font-semibold">
          Your free trial has ended. Subscribe now to keep answering calls — access pauses in{" "}
          {graceLeft} day{graceLeft === 1 ? "" : "s"}.
        </p>
        <StartCheckoutButton
          plan="unlimited"
          directCheckout
          className="mt-2 inline-block rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
        >
          Subscribe now
        </StartCheckoutButton>
      </div>
    );
  }

  const daysLeft = ceilDays(end - now);
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-950">
      Free trial: {daysLeft} day{daysLeft === 1 ? "" : "s"} left — phone & SMS included. After
      trial: feedback unlocks {SITE.betaIntroPrice}/mo for {SITE.betaDiscountYears} years (regular{" "}
      {SITE.monthlyPrice}/mo).
    </div>
  );
}
