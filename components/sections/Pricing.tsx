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

        <div className="vow-site-compare mx-auto mt-10 max-w-3xl">
          {pricing.compare.map((row) => (
            <div
              key={row.label}
              className={`vow-site-compare-row ${row.highlight ? "vow-site-compare-row-highlight" : ""}`}
            >
              <span className="text-sm text-slate-300">{row.label}</span>
              <span
                className={
                  row.highlight
                    ? "font-semibold text-teal-200"
                    : "text-sm text-slate-400"
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
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{plan.description}</p>

              <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-4xl font-bold tracking-tight text-white">{plan.price}</span>
                <span className="text-slate-500">{plan.period}</span>
              </div>
              <p
                className={`mt-2 text-sm font-medium ${
                  plan.id === "flex" ? "text-teal-200" : "text-slate-400"
                }`}
              >
                {plan.usageLine}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-white/[0.08] pt-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-slate-400">
                    <span className="font-bold text-amber-300" aria-hidden>
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

        {pricing.tip?.trim() ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-400">{pricing.tip}</p>
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
