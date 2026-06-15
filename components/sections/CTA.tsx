import { siteCta } from "@/lib/site-content";
import { SITE } from "@/lib/constants";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Container } from "@/components/ui/Container";

export function CTA() {
  return (
    <section className="vow-site-section py-20 sm:py-24">
      <Container>
        <div className="vow-site-panel relative overflow-hidden px-6 py-14 text-center sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 bg-hvac-airflow opacity-30"
            aria-hidden
          />
          <div className="relative">
            {"eyebrow" in siteCta && siteCta.eyebrow ? (
              <p className="text-sm font-semibold uppercase tracking-wider text-violet-300">
                {siteCta.eyebrow}
              </p>
            ) : null}
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
              {siteCta.title}
            </h2>
            {siteCta.subtitle?.trim() ? (
              <p className="mx-auto mt-4 max-w-lg text-lg text-slate-400">
                {siteCta.subtitle}
              </p>
            ) : null}
            <div
              className={`flex justify-center ${siteCta.subtitle?.trim() ? "mt-8" : "mt-6"}`}
            >
              <CheckoutButton
                size="lg"
                variant="secondary"
                directCheckout
                className="!border-white/25 !bg-white/10 !text-white hover:!bg-white/15"
              >
                {siteCta.button}
              </CheckoutButton>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Support: {SITE.supportEmail}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
