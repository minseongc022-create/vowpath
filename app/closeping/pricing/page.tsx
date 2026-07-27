import type { Metadata } from "next";
import Link from "next/link";
import {
  ClosePingFooter,
  ClosePingMarketingHeader,
} from "@/components/closeping/ClosePingShell";
import { getSession } from "@/lib/session";
import { CLOSEPING, CLOSEPING_ROUTES } from "@/lib/closeping/constants";
import { closePingFaq, closePingPricing, closePingSeo } from "@/lib/closeping/content-en";

export const metadata: Metadata = {
  title: `Pricing — ${CLOSEPING.name}`,
  description: `${CLOSEPING.monthlyPrice}/mo · ${CLOSEPING.trialDays}-day free trial · unlimited quotes and SMS chase.`,
};

export default async function ClosePingPricingPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-ping-50/40">
      <ClosePingMarketingHeader session={session} />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-bold text-ping-950">{closePingPricing.title}</h1>
        <div className="mt-8 rounded-2xl border-2 border-ping-500 bg-white p-8 shadow-elevated">
          <p className="text-sm font-semibold uppercase tracking-wide text-ping-600">Pro</p>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="text-5xl font-bold text-ping-950">{closePingPricing.monthly}</span>
            <span className="text-stone-500">/month</span>
          </p>
          <p className="mt-1 text-sm text-stone-500">
            or {closePingPricing.annual}/year · {closePingPricing.trial}
          </p>
          <ul className="mt-6 space-y-2">
            {closePingPricing.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="text-ping-600">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-stone-500">
            SMS pass-through at {CLOSEPING.smsOverage}/text · typical shop ≈ $5–15/mo
          </p>
          <Link
            href={CLOSEPING_ROUTES.signup}
            className="mt-8 block rounded-xl bg-ping-600 py-3 text-center text-sm font-semibold text-white hover:bg-ping-700"
          >
            Start {CLOSEPING.trialDays}-day free trial
          </Link>
        </div>
        <p className="mt-6 text-sm text-stone-600">{closePingPricing.compare}</p>

        <h2 className="mt-12 text-xl font-bold text-ping-950">FAQ</h2>
        <div className="mt-6 space-y-6">
          {closePingFaq.map((item) => (
            <div key={item.q}>
              <h3 className="font-semibold text-ping-900">{item.q}</h3>
              <p className="mt-2 text-sm text-stone-600">{item.a}</p>
            </div>
          ))}
        </div>
      </main>
      <ClosePingFooter />
    </div>
  );
}
