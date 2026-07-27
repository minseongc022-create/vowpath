import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "요금",
  description: `${SITE.name} 요금 — 라이트 3.9만, 스탠다드 6.9만, 프로 9.9만.`,
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-mesh-hero">
      <SiteHeader solid />
      <main className="sc-container py-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-steel-700">요금</p>
        <h1 className="mt-3 font-display text-3xl font-medium text-ink sm:text-4xl">
          놓친 추가공사 1건보다 싸게.
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-ink-muted sm:text-base">
          구독은 합의 OS 비용입니다. 알림톡·문자는 실사용분. 견적 ERP·적산 프로그램이 아닙니다.
        </p>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.highlight ? "border-steel-600 bg-ink text-white" : "border-paper-line bg-paper-card"
              }`}
            >
              <p className={`text-sm font-semibold ${plan.highlight ? "text-signal" : "text-steel-700"}`}>
                {plan.name}
              </p>
              <p className="mt-1 text-xs opacity-80">{plan.audience}</p>
              <p className="mt-4 font-display text-4xl">
                {plan.priceLabel}
                <span className={`ml-1 text-base font-sans ${plan.highlight ? "text-white/55" : "text-ink-muted"}`}>
                  원/월
                </span>
              </p>
              <ul className={`mt-6 flex-1 space-y-2 text-sm ${plan.highlight ? "text-white/80" : "text-ink-muted"}`}>
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-8 inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold ${
                  plan.highlight ? "bg-white text-ink" : "bg-steel-600 text-white"
                }`}
              >
                {plan.name}로 시작
              </Link>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
