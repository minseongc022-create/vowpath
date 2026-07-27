import type { Metadata } from "next";
import Link from "next/link";
import {
  ClosePingFooter,
  ClosePingMarketingHeader,
} from "@/components/closeping/ClosePingShell";
import { ClosePingRevenueCalculator } from "@/components/closeping/RevenueCalculator";
import { getSession } from "@/lib/session";
import { CLOSEPING, CLOSEPING_ROUTES } from "@/lib/closeping/constants";
import {
  closePingFeatures,
  closePingHero,
  closePingHow,
  closePingProblem,
  closePingSeo,
  closePingStats,
} from "@/lib/closeping/content-en";

export const metadata: Metadata = {
  title: closePingSeo.title,
  description: closePingSeo.description,
  openGraph: {
    title: closePingSeo.ogTitle,
    description: closePingSeo.ogDescription,
  },
};

export default async function ClosePingLandingPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-gradient-to-b from-ping-50/80 to-white">
      <ClosePingMarketingHeader session={session} />

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ping-700">
              {closePingHero.eyebrow}
            </p>
            <h1 className="mt-3 whitespace-pre-line text-4xl font-bold leading-tight text-ping-950 sm:text-5xl">
              {closePingHero.title}
            </h1>
            <p className="mt-5 text-lg text-stone-600">{closePingHero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={CLOSEPING_ROUTES.signup}
                className="rounded-xl bg-ping-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-ping-600/25 hover:bg-ping-700"
              >
                {closePingHero.cta}
              </Link>
              <a
                href={closePingHero.secondaryHref}
                className="rounded-xl border border-ping-200 bg-white px-6 py-3 text-sm font-semibold text-ping-800 hover:bg-ping-50"
              >
                {closePingHero.secondaryCta}
              </a>
            </div>
            <p className="mt-4 text-sm text-ping-700">{closePingHero.proof}</p>
          </div>
          <ClosePingRevenueCalculator />
        </div>
      </section>

      <section className="border-y border-ping-100 bg-white py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:grid-cols-3">
          {closePingStats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-ping-700">{s.value}</p>
              <p className="mt-2 text-sm text-stone-600">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-bold text-ping-950 sm:text-3xl">
          {closePingProblem.title}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {closePingProblem.items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-ping-100 bg-white p-6 shadow-card"
            >
              <h3 className="font-semibold text-ping-900">{item.title}</h3>
              <p className="mt-2 text-sm text-stone-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ping-950 py-16 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Everything you need. Nothing you don&apos;t.</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {closePingFeatures.map((f) => (
              <div key={f.title} className="rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-ping-100">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id={closePingHow.id} className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-bold text-ping-950">{closePingHow.title}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {closePingHow.steps.map((step) => (
            <div key={step.n} className="relative rounded-xl border border-ping-100 bg-white p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ping-600 text-sm font-bold text-white">
                {step.n}
              </span>
              <h3 className="mt-4 font-semibold text-ping-950">{step.title}</h3>
              <p className="mt-2 text-sm text-stone-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-ping-100 bg-ping-600 py-16">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-2xl font-bold text-white">Start chasing in minutes</h2>
          <p className="mt-3 text-ping-100">
            {CLOSEPING.trialDays}-day free trial · {CLOSEPING.monthlyPrice}/mo after · cancel anytime
          </p>
          <Link
            href={CLOSEPING_ROUTES.signup}
            className="mt-6 inline-block rounded-xl bg-white px-8 py-3 text-sm font-semibold text-ping-700 hover:bg-ping-50"
          >
            Start free trial
          </Link>
        </div>
      </section>

      <ClosePingFooter />
    </div>
  );
}
