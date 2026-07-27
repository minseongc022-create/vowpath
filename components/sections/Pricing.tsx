"use client";

import { useState } from "react";
import { useLocale, useSiteContent } from "@/components/providers/LocaleProvider";
import type { PlanId } from "@/lib/constants";
import { isPerMinutePlan } from "@/lib/plan-pricing";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TRIAL_DAYS } from "@/lib/billing-cohort";

type BillingTrack = "dispatch" | "voice";

export function Pricing() {
  const { locale } = useLocale();
  const { pricing } = useSiteContent();
  const [track, setTrack] = useState<BillingTrack>("dispatch");

  const tracks =
    "billingTracks" in pricing && pricing.billingTracks
      ? pricing.billingTracks
      : null;
  const voicePlans =
    "voicePlans" in pricing && Array.isArray(pricing.voicePlans)
      ? pricing.voicePlans
      : [];
  const visiblePlans = track === "voice" && voicePlans.length > 0 ? voicePlans : pricing.plans;
  const gridClass =
    visiblePlans.length <= 2
      ? "mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2"
      : "mx-auto mt-10 grid max-w-6xl gap-6 sm:grid-cols-2 xl:grid-cols-4";

  const trialBadge =
    locale === "es"
      ? `Prueba gratis de ${TRIAL_DAYS} días — sin tarjeta`
      : `${TRIAL_DAYS}-day free trial included — no credit card required`;
  const breakEvenTitle = locale === "es" ? "Cuenta rápida" : "Break-even math";
  const breakEvenBody =
    locale === "es"
      ? "Trabajo promedio de mitigación por agua: $8,000. Una llamada salvada a las 2 AM paga ~32 meses de Pro ($249). Agua clara = auto; fuego/Cat-3 = tu 1/2."
      : "Average water mitigation job: $8,000. One saved 2 AM call covers ~32 months of Pro ($249). Clear water auto-dispatches; fire / Cat-3 wait for your 1 / 2.";
  const breakEvenFoot =
    locale === "es"
      ? "¿Flex? Un despacho confirmado a $8K promedio = ~800× tu costo por despacho."
      : "On Flex? One confirmed dispatch at $8K avg ≈ 800× your $10 per-dispatch cost.";

  return (
    <section id="pricing" className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading title={pricing.title} subtitle={pricing.subtitle} align="center" />
        <p className="mt-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-semibold text-emerald-800">
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 11.94l6.72-6.72a.75.75 0 011.06 0z" />
            </svg>
            {trialBadge}
          </span>
        </p>

        {tracks ? (
          <div className="mx-auto mt-8 flex max-w-xl flex-col items-center gap-3">
            <div
              className="inline-flex rounded-xl border border-brand-200 bg-white p-1 shadow-sm"
              role="tablist"
              aria-label={locale === "es" ? "Tipo de facturación" : "Billing model"}
            >
              <button
                type="button"
                role="tab"
                aria-selected={track === "dispatch"}
                onClick={() => setTrack("dispatch")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  track === "dispatch"
                    ? "bg-brand-900 text-white"
                    : "text-stone-700 hover:bg-brand-50"
                }`}
              >
                {tracks.dispatch.label}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={track === "voice"}
                onClick={() => setTrack("voice")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  track === "voice"
                    ? "bg-brand-900 text-white"
                    : "text-stone-700 hover:bg-brand-50"
                }`}
              >
                {tracks.voice.label}
              </button>
            </div>
            <p className="max-w-md text-center text-xs text-stone-600">
              {track === "dispatch" ? tracks.dispatch.hint : tracks.voice.hint}
            </p>
          </div>
        ) : null}

        <div className="vow-site-compare mx-auto mt-10 max-w-3xl">
          {pricing.compare.map((row) => (
            <div
              key={row.label}
              className={`vow-site-compare-row ${row.highlight ? "vow-site-compare-row-highlight" : ""}`}
            >
              <span className="text-sm text-stone-800">{row.label}</span>
              <span
                className={
                  row.highlight
                    ? "font-semibold text-brand-700"
                    : "text-sm text-stone-700"
                }
              >
                {row.amount}
              </span>
            </div>
          ))}
        </div>

        <div className={gridClass}>
          {visiblePlans.map((plan) => (
            <article
              key={plan.id}
              className={
                plan.recommended
                  ? "vow-site-pricing-card vow-site-pricing-card-featured"
                  : "vow-site-pricing-card"
              }
            >
              {plan.recommended ? (
                <span className="vow-site-pricing-badge-featured">{plan.badge}</span>
              ) : (
                <span className="vow-site-pricing-badge">{plan.badge}</span>
              )}
              <h3 className="text-lg font-semibold text-brand-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-stone-700">{plan.description}</p>

              <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-4xl font-bold tracking-tight text-brand-900">{plan.price}</span>
                <span className="text-slate-500">{plan.period}</span>
              </div>
              <p
                className={`mt-2 text-sm font-medium ${
                  plan.id === "flex" ||
                  plan.id === "lite" ||
                  isPerMinutePlan(plan.id as PlanId)
                    ? "text-brand-700"
                    : plan.id === "pro" || plan.id === "scale"
                      ? "text-brand-800"
                      : "text-stone-700"
                }`}
              >
                {plan.usageLine}
              </p>
              {"volumeGuide" in plan && plan.volumeGuide ? (
                <p className="mt-3 rounded-lg border border-brand-200/80 bg-brand-50/80 px-3 py-2.5 text-xs leading-relaxed text-brand-900">
                  {plan.volumeGuide}
                </p>
              ) : null}

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-brand-200/80 pt-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-stone-700">
                    <span className="font-bold text-warm-500" aria-hidden>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <CheckoutButton
                  plan={plan.id as PlanId}
                  size="lg"
                  fullWidth
                  directCheckout
                  variant={plan.recommended ? "primary" : "secondary"}
                >
                  {plan.cta}
                </CheckoutButton>
              </div>
            </article>
          ))}
        </div>

        {"guarantees" in pricing && Array.isArray(pricing.guarantees) && pricing.guarantees.length > 0 ? (
          <ul className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {(pricing.guarantees as readonly string[]).map((g) => (
              <li key={g} className="flex items-center gap-1.5 text-sm text-stone-600">
                <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 11.94l6.72-6.72a.75.75 0 011.06 0z" />
                </svg>
                {g}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-brand-200 bg-brand-50 px-6 py-5 text-center">
          <p className="text-sm font-semibold text-brand-900">{breakEvenTitle}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
            {locale === "en" ? (
              <>
                Average water mitigation job: <strong className="text-brand-800">$8,000</strong>. One saved 2 AM call covers{" "}
                <strong className="text-brand-800">~27 months</strong> of Pro. Clear water auto-dispatches; fire / Cat-3 wait for your 1 / 2.
              </>
            ) : (
              breakEvenBody
            )}
          </p>
          <p className="mt-2 text-xs text-stone-500">{breakEvenFoot}</p>
        </div>

        {pricing.tip?.trim() ? (
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-stone-700">{pricing.tip}</p>
        ) : null}
        {pricing.footnote?.trim() ? (
          <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-slate-500">
            {pricing.footnote}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
