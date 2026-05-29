import { cta } from "@/lib/content";
import { SITE } from "@/lib/constants";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Container } from "@/components/ui/Container";

export function CTA() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-hvac-cta px-6 py-14 text-center shadow-glow sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 bg-hvac-airflow opacity-30"
            aria-hidden
          />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-200">
              Residential HVAC · Jobber
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
              {cta.title}
            </h2>
            {cta.subtitle?.trim() ? (
              <p className="mx-auto mt-4 max-w-lg text-lg text-brand-100">
                {cta.subtitle}
              </p>
            ) : null}
            <div
              className={`flex justify-center ${cta.subtitle?.trim() ? "mt-8" : "mt-6"}`}
            >
              <CheckoutButton
                size="lg"
                variant="secondary"
                directCheckout
                className="!border-white/30 !bg-white !text-brand-900 hover:!bg-brand-50"
              >
                {cta.button}
              </CheckoutButton>
            </div>
            <p className="mt-6 text-sm text-brand-200">
              지원: {SITE.supportEmail}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
