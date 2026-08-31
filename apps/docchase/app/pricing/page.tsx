import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "요금",
  description: `${SITE.name} 요금 — 라이트 2.9만, 스탠다드 5.9만, 프로 9.9만. 알림톡→원탭→전화 잔여 큐.`,
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-mesh-hero">
      <SiteHeader solid />
      <main className="sc-container py-14 sm:py-16">
        <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">요금</p>
        <h1 className="mt-3 max-w-2xl font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          싸게 보이고, 마진은 구독에 남깁니다.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
          알림톡 원가≈13원. 포함팩 COGS는 수천 원, 구독(2.9~9.9만)이 본마진입니다. 초과 29~39원으로 메시지
          마진도 확보합니다. 수임처 앱은 없습니다.
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
            <h2 className="font-display text-xl font-medium text-ink">포함 (소형 세무소 필수)</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>· 솔라피 알림톡 · 제로앱 제출</li>
              <li>· 원탭 회신(이미냈어요/해당없음)</li>
              <li>· 전화 잔여 큐 · 현황판 · D-day 긴급도</li>
            </ul>
          </div>
          <div>
            <h2 className="font-display text-xl font-medium text-ink">하지 않음</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>· 자동수집·기장 올인 대체</li>
              <li>· 수임처 ERP/앱 설치 강요</li>
              <li>· 광고성 마케팅 문자</li>
            </ul>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
