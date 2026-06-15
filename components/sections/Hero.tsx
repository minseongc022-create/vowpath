import { CheckoutButton } from "@/components/CheckoutButton";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { siteHero } from "@/lib/site-content";

export function Hero() {
  const h = siteHero;
  const badges: readonly string[] =
    "heroBadges" in h && Array.isArray(h.heroBadges) ? h.heroBadges : [];

  return (
    <section className="vow-hero relative overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-hvac-airflow opacity-50" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[min(100%,52rem)] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
        aria-hidden
      />

      <Container className="relative py-10 sm:py-14 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 inline-flex rounded-full border border-violet-400/30 bg-violet-600/15 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-violet-200">
            {h.badge}
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {h.headline}
            <span className="mt-1 block bg-gradient-to-r from-violet-300 to-brand-300 bg-clip-text text-transparent">
              {h.headlineAccent}
            </span>
          </h1>
          {"brandLine" in h && h.brandLine ? (
            <p className="mx-auto mt-5 max-w-2xl text-base font-medium text-violet-200/90 sm:text-lg">
              {h.brandLine}
            </p>
          ) : null}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            {h.subhead}
          </p>
        </div>

        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <CheckoutButton size="lg" directCheckout />
          <Button
            href={"secondaryCtaHref" in h && h.secondaryCtaHref ? h.secondaryCtaHref : "/#missed-call-flow"}
            variant="secondary"
            size="lg"
            className="!border-white/25 !bg-white/10 !text-white hover:!bg-white/15"
          >
            {h.secondaryCta}
          </Button>
        </div>

        {badges.length > 0 ? (
          <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {badges.map((badge) => (
              <li key={badge} className="flex items-center gap-2 text-sm text-slate-300">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-violet-300"
                  aria-hidden
                >
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M10.28 2.28a.75.75 0 00-1.06-1.06L4.5 6.94 2.78 5.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25z" />
                  </svg>
                </span>
                {badge}
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </section>
  );
}
