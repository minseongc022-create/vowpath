import { siteGetStarted, sitePricing as pricing } from "@/lib/site-content";
import type { PlanId } from "@/lib/constants";
import { checkoutErrorMessage } from "@/lib/checkout-errors";
import { StartCheckoutButton } from "@/components/checkout/StartCheckoutButton";

type PlanCheckoutProps = {
  selectedPlan: PlanId;
  paddleReady: boolean;
  checkoutErrorCode?: string | null;
};

export function PlanCheckout({
  selectedPlan,
  paddleReady,
  checkoutErrorCode,
}: PlanCheckoutProps) {
  const page = siteGetStarted;
  const bannerError = checkoutErrorCode
    ? checkoutErrorMessage(checkoutErrorCode)
    : null;

  return (
    <div className="mx-auto mt-10 max-w-5xl">
      {bannerError ? (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {bannerError}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        {pricing.plans.map((plan) => {
          const isSelected = plan.id === selectedPlan;
          const payLabel = paddleReady
            ? typeof page.payLabel === "function"
              ? page.payLabel(plan.price, plan.period)
              : `Pay ${plan.price}${plan.period}`
            : "signupLabel" in page
              ? (page.signupLabel as string)
              : "Sign up to get started";

          const buttonClass = `inline-flex w-full items-center justify-center rounded-lg px-6 py-3 text-base font-semibold transition-colors ${
            plan.recommended
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
          }`;

          return (
            <article
              key={plan.id}
              className={`relative flex h-full flex-col rounded-2xl border bg-white p-8 shadow-card ${
                isSelected
                  ? "border-slate-900 ring-2 ring-slate-900"
                  : "border-surface-border"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-0.5 text-xs font-semibold text-white">
                  {plan.badge}
                </span>
              )}
              {!plan.recommended && (
                <span className="mb-2 inline-block w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {plan.badge}
                </span>
              )}

              <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{plan.description}</p>

              <div className="mt-6 flex flex-wrap items-baseline gap-x-2">
                <span className="text-4xl font-semibold tracking-tight text-slate-900">
                  {plan.price}
                </span>
                <span className="text-slate-500">{plan.period}</span>
              </div>
              <p
                className={`mt-2 text-sm font-medium ${
                  plan.id === "flex" || plan.id === "lite"
                    ? "text-brand-700"
                    : "text-slate-600"
                }`}
              >
                {plan.usageLine}
              </p>
              {"volumeGuide" in plan && plan.volumeGuide ? (
                <p className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-brand-950">
                  {plan.volumeGuide}
                </p>
              ) : null}

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-surface-border pt-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-brand-600" aria-hidden>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {paddleReady ? (
                  <StartCheckoutButton
                    plan={plan.id}
                    directCheckout
                    className={buttonClass}
                  >
                    {payLabel}
                  </StartCheckoutButton>
                ) : (
                  <a href="/signup" className={buttonClass}>
                    {payLabel}
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
