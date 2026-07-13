import { redirect } from "next/navigation";
import { siteGetStarted, sitePricing } from "@/lib/site-content";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { IS_BETA } from "@/lib/beta";
import { ROUTES } from "@/lib/constants";
import { isPaddleConfigured } from "@/lib/paddle-config";
import { PlanCheckout } from "@/components/checkout/PlanCheckout";
import { Container } from "@/components/ui/Container";

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{
    canceled?: string;
    plan?: string;
    checkout_error?: string;
  }>;
}) {
  if (IS_BETA) {
    redirect(ROUTES.signup);
  }

  const params = await searchParams;
  const canceled = params.canceled === "1";
  const checkoutError = params.checkout_error;
  const selectedPlan = params.plan === "flex" ? "flex" : "unlimited";
  const paddleReady =
    isPaddleConfigured("unlimited") || isPaddleConfigured("flex");

  const page = siteGetStarted;
  const pricing = sitePricing;

  return (
    <div className="vow-app-shell">
      <header className="border-b border-surface-border bg-white">
        <Container className="flex h-16 items-center justify-between">
          <BrandLogo placement="auth-header" />
        </Container>
      </header>

      <Container className="py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-brand-600">{page.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-4 text-lg text-slate-600">{page.subtitle}</p>

          {canceled && (
            <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {page.canceledMessage}
            </p>
          )}

          {!paddleReady && (
            <p className="mt-6 rounded-lg border border-surface-border bg-white px-4 py-3 text-sm text-slate-600">
              {page.demoNotice}
            </p>
          )}
        </div>

        <PlanCheckout
          selectedPlan={selectedPlan}
          paddleReady={paddleReady}
          checkoutErrorCode={checkoutError}
        />

        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-surface-border bg-white px-5 py-4 shadow-card">
          <p className="text-center text-sm font-medium text-slate-900">{pricing.tip}</p>
          <p className="mt-2 text-center text-xs text-slate-500">{page.afterPay}</p>
        </div>
      </Container>
    </div>
  );
}
