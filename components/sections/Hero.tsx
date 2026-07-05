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
          <h1 className="text-3xl font-bold tracking-tight text-brand-950 sm:text-5xl lg:text-6xl">
            {h.headline}
            <span className="mt-1 block bg-gradient-to-r from-brand-900 via-brand-800 to-warm-600 bg-clip-text text-transparent">
              {h.headlineAccent}
            </span>
          </h1>
          <h2 className="mx-auto mt-5 max-w-2xl text-base font-medium text-stone-600 sm:text-lg">
            The AI Answering Service Built for Home Service Companies
          </h2>
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
          <CheckoutButton size="lg" directCheckout className="w-full sm:w-auto" />
          <Button
            href={"secondaryCtaHref" in h && h.secondaryCtaHref ? h.secondaryCtaHref : "/#missed-call-flow"}
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
          >
            {h.secondaryCta}
          </Button>
        </div>

        <p className="mt-3 text-center">
          <a href="/get-started" className="text-sm font-semibold text-brand-700 hover:underline">
            Start free — 7 days on us →
          </a>
        </p>

        <p className="mt-2 text-center text-sm text-brand-700">
          <a href="/#intake-demo" className="font-medium hover:underline">
            See a sample intake call →
          </a>
        </p>

        {badges.length > 0 ? (
          <ul className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-2 sm:flex sm:max-w-3xl sm:flex-wrap sm:items-center sm:justify-center sm:gap-2">
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

        <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-brand-200/40 pt-5">
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-500">
            <svg className="h-3.5 w-3.5 shrink-0 text-brand-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM3 18a7 7 0 1114 0H3z" />
            </svg>
            Trusted by 40+ home service companies
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-500">
            <svg className="h-3.5 w-3.5 shrink-0 text-brand-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            256-bit encrypted
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-500">
            <svg className="h-3.5 w-3.5 shrink-0 text-brand-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            No data selling · Cancel anytime
          </span>
        </div>
      </Container>
    </section>
  );
}
