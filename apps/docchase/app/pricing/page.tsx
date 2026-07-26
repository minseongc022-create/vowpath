import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PRICING, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "요금",
  description: `${SITE.name} 요금 — 스타터 7.9만, 스탠다드 12.9만, 프로 19.9만. 수임처 규모에 맞게.`,
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-mesh-hero">
      <SiteHeader solid />
      <main className="sc-container py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine-700">요금</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink">
          사무원 한 명보다 싸게, 독촉만 정확하게.
        </h1>
        <p className="mt-4 max-w-xl text-ink-muted">
          알림톡 발송 원가는 사용량에 따라 별도입니다(통상 건당 십 원대). 구독은 소프트웨어·현황판·스케줄러입니다.
        </p>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PRICING.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-7 ${
                plan.highlight
                  ? "border-pine-600 bg-ink text-paper"
                  : "border-paper-line bg-paper-card"
              }`}
            >
              <p className={`text-sm font-semibold ${plan.highlight ? "text-pine-200" : "text-pine-700"}`}>
                {plan.name}
              </p>
              <p className="mt-4 font-display text-4xl font-semibold">
                {plan.price}
                <span className={`ml-1 text-base font-sans ${plan.highlight ? "text-paper/55" : "text-ink-muted"}`}>
                  원/월
                </span>
              </p>
              <p className={`mt-2 text-sm ${plan.highlight ? "text-paper/70" : "text-ink-muted"}`}>
                {plan.blurb}
              </p>
              <p className={`mt-1 text-sm font-medium ${plan.highlight ? "text-paper" : "text-ink"}`}>
                {plan.clients}
              </p>
              <ul className={`mt-6 flex-1 space-y-2.5 text-sm ${plan.highlight ? "text-paper/80" : "text-ink-muted"}`}>
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className={plan.highlight ? "text-pine-200" : "text-pine-600"} aria-hidden>
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-8 inline-flex justify-center rounded-md px-4 py-2.5 text-sm font-semibold ${
                  plan.highlight ? "bg-paper text-ink hover:bg-white" : "bg-pine-700 text-white hover:bg-pine-800"
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-14 sc-card p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-ink">포함 / 미포함</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-pine-700">합니다</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                <li>· 수임처 자료 요청 스케줄·발송</li>
                <li>· 미제출 재요청·현황판</li>
                <li>· 정보성 알림톡 템플릿 관리</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-muted">하지 않습니다</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                <li>· 기장·전표·세무 자문</li>
                <li>· 홈택스·인증서 자동수집(그 영역은 별도 솔루션)</li>
                <li>· 광고성 마케팅 문자 대행</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
