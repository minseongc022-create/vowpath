import Link from "next/link";
import { Footer, MarketingNav } from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { SITE } from "@/lib/types";

export default async function PricingPage() {
  const session = await getSession();

  return (
    <div>
      <MarketingNav loggedIn={Boolean(session)} />
      <main className="mx-auto max-w-3xl px-5 py-20">
        <h1 className="font-display text-4xl font-bold chrome-text">Simple. Sharp. Paid by one job.</h1>
        <div className="glass chrome-border relative mt-10 overflow-hidden rounded-3xl p-8 shadow-glow">
          <div className="absolute inset-x-0 top-0 h-px shimmer-bar" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Pro</p>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-5xl font-bold text-white">{SITE.monthlyPrice}</span>
            <span className="text-ink-500">/month</span>
          </p>
          <p className="mt-1 text-sm text-ink-500">
            or {SITE.annualPrice}/year · {SITE.trialDays}-day free trial
          </p>
          <ul className="mt-8 space-y-3 text-sm text-ink-300">
            {[
              "Unlimited quotes & users",
              "48h / 7d / 14d SMS chase",
              "Pipeline + chase dashboard",
              "CSV import",
              "Branded opt-out compliant SMS",
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-white">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="btn-chrome mt-8 w-full">
            Start free trial
          </Link>
        </div>
        <p className="mt-6 text-sm text-ink-500">
          QuoteFollow charges $299/mo for follow-up only. ClosePing is self-serve at {SITE.monthlyPrice}.
        </p>
      </main>
      <Footer />
    </div>
  );
}
