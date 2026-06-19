import { CheckoutButton } from "@/components/CheckoutButton";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { siteHero } from "@/lib/site-content";

export function Hero() {
  const h = siteHero;
  const badges: readonly string[] =
    "heroBadges" in h && Array.isArray(h.heroBadges) ? h.heroBadges : [];

  return (
    <section className="vow-hero relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-hvac-airflow opacity-50" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[min(100%,52rem)] -translate-x-1/2 rounded-full bg-brand-300/30 blur-3xl"
        aria-hidden
      />

      <Container className="relative py-10 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 inline-flex rounded-full border border-brand-300/50 bg-brand-100 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand-800">
            {h.badge}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-brand-950 sm:text-5xl lg:text-6xl">
            {h.headline}
            <span className="mt-1 block bg-gradient-to-r from-brand-900 via-brand-800 to-warm-600 bg-clip-text text-transparent">
              {h.headlineAccent}
            </span>
          </h1>
          {"brandLine" in h && h.brandLine ? (
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-stone-700">
              {h.brandLine}
            </p>
          ) : null}
          {"subhead" in h && h.subhead ? (
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-600">
              {h.subhead}
            </p>
          ) : null}
          {"trustLine" in h && h.trustLine ? (
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-brand-800/90">
              {h.trustLine}
            </p>
          ) : null}
        </div>

        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <CheckoutButton size="lg" directCheckout />
          <Button
            href={"secondaryCtaHref" in h && h.secondaryCtaHref ? h.secondaryCtaHref : "/#missed-call-flow"}
            variant="secondary"
            size="lg"
          >
            {h.secondaryCta}
          </Button>
        </div>

        {badges.length > 0 ? (
          <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            {badges.map((badge) => (
              <li
                key={badge}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-sm font-medium text-brand-800"
              >
                <svg className="h-3.5 w-3.5 shrink-0 text-brand-600" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                  <path d="M10.28 2.28a.75.75 0 00-1.06-1.06L4.5 6.94 2.78 5.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25z" />
                </svg>
                {badge}
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </section>
  );
}
