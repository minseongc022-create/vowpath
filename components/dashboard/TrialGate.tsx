"use client";

import { useEffect, useState } from "react";
import { isEnglishUi } from "@/lib/locale";
import { openPaddleCheckout } from "@/lib/paddle-checkout-client";
import { StartCheckoutButton } from "@/components/checkout/StartCheckoutButton";
import { SITE } from "@/lib/constants";

type BillingStatusResponse = {
  beta: boolean;
  entitled: boolean;
};

/**
 * Blocks the dashboard once a user's 14-day trial has ended and they have no active
 * subscription. Feedback unlocks $129/mo for 5 years (regular $189/mo).
 */
export function TrialGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<BillingStatusResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/billing/status", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: BillingStatusResponse | null) => setStatus(d))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!status || status.beta || status.entitled) {
    return <>{children}</>;
  }

  return <TrialEndedCard />;
}

function TrialEndedCard() {
  const en = isEnglishUi();
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock() {
    if (!feedback.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: feedback.trim() }),
      });
      const data = (await res.json()) as {
        url?: string;
        transactionId?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "failed");
      }
      if (data.transactionId) {
        await openPaddleCheckout(data.transactionId);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("failed");
    } catch {
      setError(
        en
          ? "Something went wrong. Please try again."
          : "문제가 발생했어요. 다시 시도해 주세요.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-brand-950/70 p-4 sm:items-center">
      <div className="my-auto w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-surface-border bg-white p-5 shadow-card sm:p-8">
        <h2 className="text-xl font-bold text-slate-900">
          {en ? "Your free trial has ended" : "무료 체험이 끝났어요"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {en
            ? `Leave a quick line of feedback and keep going at ${SITE.betaIntroPrice}/mo for ${SITE.betaDiscountYears} years (regular ${SITE.monthlyPrice}/mo).`
            : `짧은 후기 한 줄만 남겨주시면 ${SITE.betaDiscountYears}년간 ${SITE.betaIntroPrice}/월로 계속 쓰실 수 있어요 (정가 ${SITE.monthlyPrice}/월).`}
        </p>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={
            en
              ? "What's working, what's not — one line is plenty."
              : "어떤 점이 좋았고 아쉬웠는지 한 줄만 적어주세요."
          }
          className="mt-4 w-full min-h-[44px] rounded-lg border border-surface-border px-3 py-2.5 text-base text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
        />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={() => void handleUnlock()}
          disabled={!feedback.trim() || submitting}
          className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? en
              ? "Working…"
              : "처리 중…"
            : en
              ? `Submit & unlock ${SITE.betaIntroPrice}/mo`
              : `제출하고 ${SITE.betaIntroPrice}/월로 계속하기`}
        </button>

        <StartCheckoutButton
          plan="unlimited"
          directCheckout
          className="mt-3 block w-full text-center text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          {en
            ? `No thanks, continue at ${SITE.monthlyPrice}/mo`
            : `괜찮아요, 정가 ${SITE.monthlyPrice}/월로 계속할게요`}
        </StartCheckoutButton>
      </div>
    </div>
  );
}
