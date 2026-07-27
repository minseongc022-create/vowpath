import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LegalLinksStrip } from "@/components/layout/LegalLinksStrip";
import {
  QuoteChaseHow,
  QuoteChaseLandingHero,
  QuoteChaseModules,
  QuoteChaseProblem,
} from "@/components/sections/QuoteChaseLanding";
import { DemoVideoHero } from "@/components/sections/DemoVideoHero";
import { getSession } from "@/lib/session";
import { ROUTES } from "@/lib/constants";
import { TRIAL_DAYS } from "@/lib/billing-cohort";
import {
  quoteChaseCtaEn,
  quoteChaseFaqEn,
  quoteChaseSeoMeta,
} from "@/lib/content-quote-chase-en";

export const metadata: Metadata = {
  title: quoteChaseSeoMeta.title,
  description: quoteChaseSeoMeta.description,
  keywords: [...quoteChaseSeoMeta.keywords],
  openGraph: {
    title: quoteChaseSeoMeta.ogTitle,
    description: quoteChaseSeoMeta.ogDescription,
    type: "website",
  },
};

export default async function QuoteLandingPage() {
  const session = await getSession();
  const cta = quoteChaseCtaEn;

  return (
    <div className="vow-site flex min-h-screen flex-col overflow-x-hidden">
      <Header session={session} />
      <main className="flex-1">
        <QuoteChaseLandingHero />
        <QuoteChaseProblem />
        <QuoteChaseModules />
        <QuoteChaseHow />
        <DemoVideoHero vertical="hvac" />
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="text-2xl font-bold text-brand-950 sm:text-3xl">Common questions</h2>
            <div className="mt-8 space-y-6">
              {quoteChaseFaqEn.map((item) => (
                <div key={item.q}>
                  <h3 className="font-semibold text-brand-900">{item.q}</h3>
                  <p className="mt-2 text-stone-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="border-t border-brand-100 bg-brand-600 py-16">
          <div className="mx-auto max-w-2xl px-5 text-center">
            <h2 className="text-2xl font-bold text-white">{cta.title}</h2>
            <p className="mt-3 text-brand-100">{cta.subtitle}</p>
            <p className="mt-2 text-sm text-brand-200">{TRIAL_DAYS}-day free trial · setup in minutes</p>
            <Link
              href={cta.href}
              className="mt-6 inline-block rounded-xl bg-white px-8 py-3 text-sm font-semibold text-brand-700 shadow hover:bg-brand-50"
            >
              {cta.cta}
            </Link>
          </div>
        </section>
      </main>
      <LegalLinksStrip />
      <Footer />
    </div>
  );
}
