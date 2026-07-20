"use client";

import { useEffect, useState } from "react";
import { openPaddleCheckout } from "@/lib/paddle-checkout-client";
import { StartCheckoutButton } from "@/components/checkout/StartCheckoutButton";
import { SITE, ROUTES, type PlanId, DEFAULT_PLAN } from "@/lib/constants";
import { founderRateLabel, founderRateShort, regularRateLabel } from "@/lib/plan-pricing";

type BillingStatusResponse = {
  beta: boolean;
  entitled: boolean;
};

const PLAN_OPTIONS: { id: PlanId; title: string }[] = [
  { id: "flex", title: "Flex" },
  { id: "pro", title: "Pro" },
  { id: "scale", title: "Scale" },
];

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
  const [feedback, setFeedback] = useState("");
  const [plan, setPlan] = useState<PlanId>(DEFAULT_PLAN);
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
        body: JSON.stringify({ text: feedback.trim(), plan }),
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
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const founderRate = founderRateLabel(plan);
  const regularRate = regularRateLabel(plan);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-brand-950/70 p-4 sm:items-center">
      <div className="my-auto w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-surface-border bg-white p-5 shadow-card sm:p-8">
        <h2 className="text-xl font-bold text-slate-900">Your free trial has ended</h2>
        <p className="mt-2 text-sm text-slate-600">
          Share one line of feedback and lock in founder pricing for {SITE.betaDiscountYears}{" "}
          years — then regular rates ({regularRate}). Caps and overage rules at{" "}
          <a href={ROUTES.pricing} className="font-medium text-brand-600 underline">
            effiroad.com/#pricing
          </a>
          .
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {PLAN_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPlan(option.id)}
              className={`rounded-lg border-2 px-2 py-2.5 text-left text-sm transition ${
                plan === option.id
                  ? "border-brand-500 bg-brand-50 text-brand-900"
                  : "border-surface-border text-slate-700 hover:border-brand-300"
              }`}
            >
              <span className="block font-semibold">{option.title}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-600">
                {founderRateShort(option.id)}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Lite also available at checkout — best for very quiet months.
        </p>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="What's working, what's not — one line is plenty."
          className="mt-4 w-full min-h-[44px] rounded-lg border border-surface-border px-3 py-2.5 text-base text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
        />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={() => void handleUnlock()}
          disabled={!feedback.trim() || submitting}
          className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Working…" : `Submit & unlock ${founderRate}`}
        </button>

        <StartCheckoutButton
          plan={plan}
          directCheckout
          className="mt-3 block w-full text-center text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          No thanks, continue at {regularRate}
        </StartCheckoutButton>
      </div>
    </div>
  );
}
