"use client";

import { usePathname } from "next/navigation";
import { VerticalSwitcher } from "@/components/layout/VerticalSwitcher";
import { CheckoutButton } from "@/components/CheckoutButton";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useLocale, useSiteContent } from "@/components/providers/LocaleProvider";
import { hvacHero } from "@/lib/content-marketing-hvac-en";
import { TRIAL_DAYS } from "@/lib/billing-cohort";

export function Hero() {
  const pathname = usePathname();
  const isHvac = pathname === "/hvac";
  const { locale } = useLocale();
  const { hero: siteHero } = useSiteContent();
  const h = isHvac
    ? {
        badge: hvacHero.eyebrow,
        headline: "Never miss a no-heat call",
        headlineAccent: "when you're on another job.",
        brandLine: hvacHero.subhead,
        subhead: undefined,
        trustLine: undefined,
        secondaryCta: hvacHero.secondaryCta,
        secondaryCtaHref: "/hvac#how-it-works",
        heroBadges: hvacHero.trustPills,
      }
    : siteHero;
  const badges: readonly string[] =
    "heroBadges" in h && Array.isArray(h.heroBadges) ? h.heroBadges : [];
  const isEs = locale === "es";

  const trialLink = isEs
    ? `Empieza gratis — ${TRIAL_DAYS} días por nuestra cuenta →`
    : `Start free — ${TRIAL_DAYS} days on us →`;
  const guarantees = isEs
    ? ["Garantía 30 días", "Cifrado 256-bit", "Cancela cuando quieras"]
    : ["30-day money-back", "256-bit encrypted", "Cancel anytime"];

  return (
    <section className="vow-hero relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-hvac-airflow opacity-50" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[min(100%,52rem)] -translate-x-1/2 rounded-full bg-brand-300/30 blur-3xl"
        aria-hidden
      />

      <Container className="relative w-full py-8 sm:py-14 lg:py-16">
        <div className="mb-5 flex justify-center md:hidden">
          <VerticalSwitcher />
        </div>
        <div className="mx-auto w-full max-w-3xl text-center">
          <p className="mb-3 inline-flex rounded-full border border-brand-300/50 bg-brand-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-800 sm:text-xs">
            {h.badge}
          </p>
          <h1 className="text-[1.65rem] font-bold leading-[1.15] tracking-tight text-brand-950 sm:text-5xl">
            {h.headline}
            <span className="mt-1 block bg-gradient-to-r from-brand-900 via-brand-800 to-warm-600 bg-clip-text text-transparent">
              {h.headlineAccent}
            </span>
          </h1>
          {"brandLine" in h && h.brandLine ? (
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-stone-700 sm:mt-5 sm:text-lg">
              {h.brandLine}
            </p>
          ) : null}
          {"trustLine" in h && h.trustLine ? (
            <p className="mx-auto mt-3 max-w-xl text-xs font-medium text-brand-800/90 sm:text-sm">
              {h.trustLine}
            </p>
          ) : null}
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-lg flex-col items-stretch gap-3 px-1 sm:max-w-xl sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <CheckoutButton size="lg" directCheckout={false} className="w-full sm:w-auto" />
          <Button
            href={"secondaryCtaHref" in h && h.secondaryCtaHref ? h.secondaryCtaHref : "/#how-it-works"}
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
          >
            {h.secondaryCta}
          </Button>
        </div>

        <p className="mt-3 text-center">
          <a href="/get-started" className="text-sm font-semibold text-brand-700 hover:underline">
            {trialLink}
          </a>
        </p>

        {badges.length > 0 ? (
          <ul className="mx-auto mt-6 grid w-full max-w-sm grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:flex sm:max-w-3xl sm:flex-wrap sm:items-center sm:justify-center sm:gap-2">
            {badges.map((badge) => (
              <li
                key={badge}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-left text-sm font-medium text-brand-800"
              >
                <svg className="h-3.5 w-3.5 shrink-0 text-brand-600" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                  <path d="M10.28 2.28a.75.75 0 00-1.06-1.06L4.5 6.94 2.78 5.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25z" />
                </svg>
                {badge}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-brand-200/40 pt-5">
          {guarantees.map((label) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs text-stone-500">
              <svg className="h-3.5 w-3.5 shrink-0 text-brand-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {label}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
