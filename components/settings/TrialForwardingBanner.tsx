"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/constants";
import { isEnglishUi } from "@/lib/locale";

type BillingStatus = {
  entitled: boolean;
  beta: boolean;
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
};

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

  const trialEnd = status.trialEndsAt ? new Date(status.trialEndsAt) : null;
  const daysLeft =
    trialEnd && status.subscriptionStatus === "trialing"
      ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000))
      : null;

  if (daysLeft === null) return null;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-950">
      {en
        ? `Free trial: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left — phone & SMS included. After trial: feedback unlocks ${SITE.betaIntroPrice}/mo for ${SITE.betaDiscountYears} years (regular ${SITE.monthlyPrice}/mo).`
        : `무료 체험 ${daysLeft}일 남음 — 전화·문자 사용 가능. 체험 후: 후기 제출 시 ${SITE.betaDiscountYears}년간 ${SITE.betaIntroPrice}/월 (정가 ${SITE.monthlyPrice}/월).`}
    </div>
  );
}
