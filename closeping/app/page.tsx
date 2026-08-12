import Link from "next/link";
import { Footer, MarketingNav } from "@/components/Shell";
import { RevenueCalculator } from "@/components/RevenueCalculator";
import { getSession } from "@/lib/auth";
import { SITE } from "@/lib/types";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-noise opacity-60" />
      <MarketingNav loggedIn={Boolean(session)} />

      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="animate-rise">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-400">
              HVAC · Roofing · Plumbing · Remodel
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              <span className="chrome-text">They got the quote.</span>
              <br />
              <span className="text-white">Life got in the way.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-ink-300">
              {SITE.description} Polite. Branded. Opt-out compliant.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-chrome">
                Start {SITE.trialDays}-day free trial
              </Link>
              <a href="#how" className="btn-ghost">
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-500">
              One recovered job pays for months · {SITE.monthlyPrice}/mo after trial
            </p>
          </div>
          <RevenueCalculator />
        </div>
      </section>

      <section className="border-y border-white/5 bg-black/30 py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:grid-cols-3">
          {[
            { v: "48%", l: "never follow up after first contact" },
            { v: "80%", l: "of closed deals need 5+ touches" },
            { v: "$4K+", l: "avg monthly leak from cold quotes" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p className="font-display text-4xl font-bold chrome-text">{s.v}</p>
              <p className="mt-2 text-sm text-ink-400">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center font-display text-3xl font-bold text-white">
          You&apos;re not bad at sales. You&apos;re out of hours.
        </h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {[
            {
              t: "“I'll text tonight”",
              b: "Night never comes. Two other bids land while you're still on the ladder.",
            },
            {
              t: "CRM open, chase zero",
              b: "Jobber and ServiceTitan are powerful — if the quote dies in draft, close rate doesn't move.",
            },
            {
              t: "Forty notes, zero nudges",
              b: "You meant Friday. Friday became never. That's capacity — not character.",
            },
          ].map((item) => (
            <div key={item.t} className="glass chrome-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-white">{item.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-400">{item.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="relative border-t border-white/5 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center font-display text-3xl font-bold text-white">How it works</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Add the quote", d: "Name, phone, amount — or CSV import." },
              { n: "02", t: "Send once", d: "Branded SMS with your shop name." },
              { n: "03", t: "Chase runs", d: "Auto nudges at 48h, 7d, 14d." },
              { n: "04", t: "Mark won", d: "Chase stops the second they book." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                <span className="font-display text-xs font-bold tracking-widest text-ink-500">
                  {s.n}
                </span>
                <h3 className="mt-3 font-display font-semibold text-white">{s.t}</h3>
                <p className="mt-2 text-sm text-ink-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-xl px-5 text-center">
          <div className="glass chrome-border rounded-3xl px-8 py-12 shadow-glow">
            <h2 className="font-display text-2xl font-bold chrome-text">Start chasing in minutes</h2>
            <p className="mt-3 text-ink-400">
              {SITE.trialDays}-day free trial · {SITE.monthlyPrice}/mo · cancel anytime
            </p>
            <Link href="/signup" className="btn-chrome mt-8">
              Create account
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
