import { pricing } from "@/lib/content";
import type { PlanId } from "@/lib/constants";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Pricing() {
  return (
    <section id="pricing" className="hvac-section-alt py-20 sm:py-24">
      <Container>
        <SectionHeading
          title={pricing.title}
          subtitle={pricing.subtitle}
          align="center"
        />

        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card">
          {pricing.compare.map((row) => (
            <div
              key={row.label}
              className={`flex items-center justify-between gap-4 border-b border-surface-border px-5 py-3.5 last:border-b-0 ${
                row.highlight ? "bg-brand-50" : "bg-white"
              }`}
            >
              <span className="text-sm text-slate-600">{row.label}</span>
              <span
                className={
                  row.highlight
                    ? "font-semibold text-brand-700"
                    : "text-sm text-slate-500"
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
              className={`relative flex h-full flex-col rounded-2xl border bg-white p-8 shadow-card ${
                plan.recommended
                  ? "border-brand-600 ring-2 ring-brand-500/30"
                  : "border-surface-border"
              }`}
            >
              {plan.recommended ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-hvac-button px-3 py-0.5 text-xs font-semibold text-white shadow-md">
                  {plan.badge}
                </span>
              ) : (
                <span className="mb-2 inline-block w-fit rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-lg font-semibold text-brand-950">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{plan.description}</p>

              <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-4xl font-bold tracking-tight text-brand-800">
                  {plan.price}
                </span>
                <span className="text-slate-500">{plan.period}</span>
              </div>
              <p
                className={`mt-2 text-sm font-medium ${
                  plan.id === "flex" ? "text-brand-600" : "text-slate-600"
                }`}
              >
                {plan.usageLine}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-surface-border pt-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-slate-600">
                    <span className="font-bold text-brand-600" aria-hidden>
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
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-600">
            {pricing.tip}
          </p>
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
