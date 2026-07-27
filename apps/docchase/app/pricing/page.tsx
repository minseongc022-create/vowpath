import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "요금",
  description: `${SITE.name} 요금 — 라이트 4.9만, 스탠다드 9.9만, 프로 17.9만. 수임처 앱 없이 마감 회수.`,
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-mesh-hero">
      <SiteHeader solid />
      <main className="sc-container py-14 sm:py-16">
        <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">요금</p>
        <h1 className="mt-3 max-w-2xl font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          사무원 월급보다 싸게, 규모에 맞게.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
          구독은 운영 도구 비용입니다. 알림톡은 플랜에 포함되고, 초과분만 건당 과금합니다 (원가≈13원대,
          초과 15~20원으로 마진을 얇게 가져갑니다). 수임처에 회계앱을 강요하지 않습니다.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.highlight ? "border-pine-600 bg-ink text-paper shadow-soft" : "border-paper-line bg-paper-card"
              }`}
            >
              <p className={`text-sm font-semibold ${plan.highlight ? "text-pine-200" : "text-pine-700"}`}>
                {plan.name}
              </p>
              <p className="mt-1 text-xs opacity-80">{plan.audience}</p>
              <p className="mt-4 font-display text-4xl font-medium">
                {plan.priceLabel}
                <span className={`ml-1 text-base font-sans ${plan.highlight ? "text-paper/55" : "text-ink-muted"}`}>
                  원/월
                </span>
              </p>
              <p className={`mt-2 text-sm ${plan.highlight ? "text-paper/70" : "text-ink-muted"}`}>{plan.blurb}</p>
              <ul className={`mt-6 flex-1 space-y-2.5 text-sm ${plan.highlight ? "text-paper/80" : "text-ink-muted"}`}>
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className={plan.highlight ? "text-pine-200" : "text-pine-600"}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-8 inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold ${
                  plan.highlight ? "bg-paper text-ink hover:bg-white" : "bg-pine-700 text-white hover:bg-pine-800"
                }`}
              >
                {plan.name}로 시작
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-6 sc-card p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h2 className="font-display text-xl font-medium text-ink">포함</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>· 자료 요청(알림톡) · 미제출 추적</li>
              <li>· 스탠다드+: 제출 링크(수임처 앱 없음)</li>
              <li>· 자동 독촉 스케줄 · 현황판</li>
            </ul>
          </div>
          <div>
            <h2 className="font-display text-xl font-medium text-ink">하지 않음</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>· 세무 자문·기장 판단 대체</li>
              <li>· 수임처에 무거운 ERP 설치 강요</li>
              <li>· 광고성 마케팅 문자</li>
            </ul>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
