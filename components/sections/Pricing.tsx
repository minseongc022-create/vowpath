import { sitePricing as pricing } from "@/lib/site-content";
import type { PlanId } from "@/lib/constants";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Pricing() {
  return (
    <section id="pricing" className="vow-site-section py-20 sm:py-24">
      <Container>
        <SectionHeading title={pricing.title} subtitle={pricing.subtitle} align="center" />
        <p className="mt-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-semibold text-emerald-800">
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 11.94l6.72-6.72a.75.75 0 011.06 0z" />
            </svg>
            14-day free trial included — no credit card required
          </span>
        </p>

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

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          {pricing.plans.map((plan) => (
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
                  plan.id === "flex" ? "text-brand-700" : "text-stone-700"
                }`}
              >
                {plan.usageLine}
              </p>

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
          <p className="text-sm font-semibold text-brand-900">Break-even math</p>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
            Average water mitigation job: <strong className="text-brand-800">$8,000</strong>.{" "}
            One saved 2 AM call covers{" "}
            <strong className="text-brand-800">47 months</strong> of Unlimited at $169/mo.
          </p>
          <p className="mt-2 text-xs text-stone-500">
            On Flex? One confirmed dispatch at $8K avg = ~700× your per-dispatch cost.
          </p>
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
