import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { IntakeCallDemo } from "@/components/sections/IntakeCallDemo";
import { SocialProof } from "@/components/sections/SocialProof";
import { Problem } from "@/components/sections/Problem";
import { ProductStack } from "@/components/sections/ProductStack";
import { MissedCallFlow } from "@/components/sections/MissedCallFlow";
import { ApprovalLoop } from "@/components/sections/ApprovalLoop";
import { AiDispatcher } from "@/components/sections/AiDispatcher";
import { SchedulingModes } from "@/components/sections/SchedulingModes";
import { Comparison } from "@/components/sections/Comparison";
import { Features } from "@/components/sections/Features";
import { TrustROI } from "@/components/sections/TrustROI";
import { About } from "@/components/sections/About";
import { getSession } from "@/lib/session";
import { ROUTES } from "@/lib/constants";
import {
  problemHvac,
  productStackHvac,
  missedCallFlowHvac,
  approvalLoopHvac,
  aiDispatcherHvac,
  schedulingModesHvac,
  comparisonHvac,
  featuresHvac,
  trustRoiHvac,
  socialProofHvac,
  aboutHvac,
  hvacDispatchPolicy,
  hvacHowItWorks,
  hvacPricing,
  hvacFaq,
  hvacSeoMeta,
} from "@/lib/content-marketing-hvac-en";

export const metadata: Metadata = {
  title: hvacSeoMeta.title,
  description: hvacSeoMeta.description,
  keywords: hvacSeoMeta.keywords,
  openGraph: {
    title: hvacSeoMeta.ogTitle,
    description: hvacSeoMeta.ogDescription,
    type: "website",
  },
};

export default async function HvacPage() {
  const session = await getSession();

  return (
    <div className="vow-site flex min-h-screen flex-col">
      <Header session={session} />
      <main className="flex-1">
        {/* Hero — common across every vertical */}
        <Hero />

        {/* Interactive intake call demo — HVAC no-heat scenario */}
        <IntakeCallDemo vertical="hvac" />

        <SocialProof variant="trust" content={socialProofHvac} />
        <Problem content={problemHvac} />
        <ProductStack content={productStackHvac} />
        <MissedCallFlow content={missedCallFlowHvac} />
        <ApprovalLoop content={approvalLoopHvac} />
        <AiDispatcher content={aiDispatcherHvac} />
        <SchedulingModes content={schedulingModesHvac} />
        <Comparison content={comparisonHvac} />
        <Features content={featuresHvac} />

        {/* Dispatch policy detail table */}
        <section className="border-y border-brand-100 bg-brand-50/40 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-5">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {hvacDispatchPolicy.title}
            </h2>
            <p className="mt-2 text-slate-600">{hvacDispatchPolicy.description}</p>
            <div className="mt-8 overflow-x-auto rounded-xl border border-brand-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-brand-100 bg-brand-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-800">Scenario</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-800">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hvacDispatchPolicy.rows.map((row) => (
                    <tr key={row.scenario}>
                      <td className="px-4 py-3 text-slate-700">{row.scenario}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium ${
                            row.badge === "auto"
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              row.badge === "auto" ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {row.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-5">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {hvacHowItWorks.title}
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {hvacHowItWorks.steps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-xl border border-brand-200 bg-white p-5 shadow-sm"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {step.number}
                  </span>
                  <h3 className="mt-3 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <TrustROI content={trustRoiHvac} />
        <SocialProof content={socialProofHvac} />
        <About content={aboutHvac} />

        {/* Pricing */}
        <section id="pricing" className="border-y border-brand-100 bg-brand-50/40 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-5">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {hvacPricing.title}
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {[hvacPricing.unlimited, hvacPricing.flex].map((plan) => (
                <div
                  key={plan.name}
                  className="rounded-xl border border-brand-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                    {plan.name}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{plan.price}</p>
                  <p className="mt-1.5 text-sm text-slate-600">{plan.description}</p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-slate-700">
                        <span className="shrink-0 text-emerald-500" aria-hidden>
                          ✓
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`${ROUTES.signup}?vertical=hvac`}
                    className="mt-5 block w-full rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Start free trial
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Common questions
            </h2>
            <div className="mt-8 space-y-6">
              {hvacFaq.map((item) => (
                <div key={item.q}>
                  <h3 className="font-semibold text-slate-900">{item.q}</h3>
                  <p className="mt-2 text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-brand-100 bg-brand-600 py-16">
          <div className="mx-auto max-w-2xl px-5 text-center">
            <h2 className="text-2xl font-bold text-white">
              Ready to stop missing no-heat calls?
            </h2>
            <p className="mt-3 text-brand-100">
              30-day free trial. Setup takes 10 minutes.
            </p>
            <Link
              href={`${ROUTES.signup}?vertical=hvac`}
              className="mt-6 inline-block rounded-xl bg-white px-8 py-3 text-sm font-semibold text-brand-700 shadow hover:bg-brand-50"
            >
              Start free trial — HVAC
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
