"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/constants";
import { isEnglishUi } from "@/lib/locale";
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
  const en = isEnglishUi();

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

  // Trial ended but still inside the grace window → urgent "subscribe now" nag.
  if (now >= end && now < graceEnd) {
    const graceLeft = ceilDays(graceEnd - now);
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
        <p className="font-semibold">
          {en
            ? `Your free trial has ended. Subscribe now to keep answering calls — access pauses in ${graceLeft} day${graceLeft === 1 ? "" : "s"}.`
            : `무료 체험이 끝났어요. 지금 결제하면 전화 응대가 계속돼요 — ${graceLeft}일 뒤 기능이 정지됩니다.`}
        </p>
        <StartCheckoutButton
          plan="unlimited"
          directCheckout
          className="mt-2 inline-block rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
        >
          {en ? "Subscribe now" : "지금 결제하기"}
        </StartCheckoutButton>
      </div>
    );
  }

  // Still in the trial → friendly days-left reminder.
  const daysLeft = ceilDays(end - now);
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-950">
      {en
        ? `Free trial: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left — phone & SMS included. After trial: feedback unlocks ${SITE.betaIntroPrice}/mo for ${SITE.betaDiscountYears} years (regular ${SITE.monthlyPrice}/mo).`
        : `무료 체험 ${daysLeft}일 남음 — 전화·문자 사용 가능. 체험 후: 후기 제출 시 ${SITE.betaDiscountYears}년간 ${SITE.betaIntroPrice}/월 (정가 ${SITE.monthlyPrice}/월).`}
    </div>
  );
}
