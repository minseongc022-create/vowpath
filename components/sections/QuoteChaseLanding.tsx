import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ROUTES } from "@/lib/constants";
import {
  quoteChaseHeroEn,
  quoteChaseHowEn,
  quoteChaseModulesEn,
  quoteChaseProblemEn,
} from "@/lib/content-quote-chase-en";

export function QuoteChaseLandingHero() {
  const h = quoteChaseHeroEn;
  return (
    <section className="vow-site-section border-b border-brand-100 bg-gradient-to-b from-brand-50 to-white py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">{h.eyebrow}</p>
          <h1 className="mt-4 whitespace-pre-line text-3xl font-bold tracking-tight text-brand-950 sm:text-5xl">
            {h.title}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-stone-700 sm:text-lg">{h.subtitle}</p>
          <ul className="mx-auto mt-8 max-w-xl space-y-2 text-left text-sm text-stone-800 sm:text-base">
            {h.bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={ROUTES.signup}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-700 px-8 py-3 text-sm font-semibold text-white shadow hover:bg-brand-800 sm:w-auto"
            >
              {h.cta}
            </Link>
            <Link
              href={h.secondaryHref}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-brand-300 bg-white px-8 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 sm:w-auto"
            >
              {h.secondaryCta}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function QuoteChaseProblem() {
  const p = quoteChaseProblemEn;
  return (
    <section id={p.id} className="vow-site-section py-16 sm:py-20">
      <Container>
        <SectionHeading label={p.label} title={p.title} align="center" />
        <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-3">
          {p.items.map((item) => (
            <article key={item.title} className="vow-site-card p-6">
              <h3 className="text-lg font-semibold text-brand-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">{item.body}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function QuoteChaseModules() {
  const m = quoteChaseModulesEn;
  return (
    <section id={m.id} className="vow-site-section border-y border-brand-100 bg-brand-50/40 py-16 sm:py-20">
      <Container>
        <SectionHeading label={m.label} title={m.title} subtitle={m.subtitle} align="center" />
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          {m.modules.map((mod) => (
            <article
              key={mod.id}
              className={`vow-site-card relative flex flex-col p-6 ${mod.id === "quote" ? "ring-2 ring-brand-500/30" : ""}`}
            >
              {mod.badge ? (
                <span className="absolute -top-3 left-5 rounded-full bg-brand-700 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {mod.badge}
                </span>
              ) : null}
              <h3 className="text-xl font-bold text-brand-900">{mod.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-700">{mod.description}</p>
              <ul className="mt-4 space-y-2 border-t border-brand-200/80 pt-4">
                {mod.points.map((point) => (
                  <li key={point} className="flex gap-2 text-sm text-stone-800">
                    <span className="text-emerald-600" aria-hidden>
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function QuoteChaseHow() {
  const h = quoteChaseHowEn;
  return (
    <section id={h.id} className="vow-site-section py-16 sm:py-20">
      <Container>
        <h2 className="text-center text-2xl font-bold text-brand-950 sm:text-3xl">{h.title}</h2>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
          {h.steps.map((step) => (
            <div key={step.number} className="vow-site-card flex gap-4 p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                {step.number}
              </span>
              <div>
                <h3 className="font-semibold text-brand-900">{step.title}</h3>
                <p className="mt-1.5 text-sm text-stone-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
