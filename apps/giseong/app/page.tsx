import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";

const pains = [
  {
    title: "건설 매출은 조 단위인데, 기성 합의는 카톡·엑셀입니다",
    body: "2024년 건설업 매출 약 488조. 그 현금은 월 기성으로 돕니다. 실무는 PDF·카톡·구두 확인이 뒤섞여 지연·삭감·분쟁이 납니다.",
  },
  {
    title: "공공은 하도급지킴이, 민간 SMB는 비어 있습니다",
    body: "공공·조달은 전자지급이 있습니다. 민간 전문건설이 원청에게 ‘이번 달 기성 이 금액’을 링크 한 장으로 받는 전용 대장은 없습니다. 얼마에요류는 자사 회계이지 상대방 승인이 아닙니다.",
  },
  {
    title: "추가공사보다 돈이 크고, 세무·AI전화보다 상위호환이 약합니다",
    body: "인테리어 추가공사·세무 서류추적·미국 AI전화보다 사건당 금액·국내 업체 수가 큽니다. 클로브급 평생무료 거인이 이 쐐기를 잠그지 않았습니다.",
  },
];

const steps = [
  {
    n: "01",
    title: "기성 기간·금액·누계를 적습니다",
    body: "품목·이번 청구·기청구·유보금을 넣습니다. 검수 메모도 남깁니다.",
  },
  {
    n: "02",
    title: "원청·발주에게 승인 링크를 보냅니다",
    body: "앱 설치 없음. 카톡/문자로 링크만. 상대는 금액 보고 승인·수정요청·거절.",
  },
  {
    n: "03",
    title: "승인액이 기성대장에 쌓입니다",
    body: "미승인·수정요청만 남깁니다. ‘그달에 합의했다’는 기록이 남습니다.",
  },
];

export default function HomePage() {
  return (
    <div className="bg-mesh-hero">
      <SiteHeader />

      <section className="sc-container grid gap-10 py-14 lg:min-h-[78vh] lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <p className="animate-rise font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {SITE.name}
          </p>
          <h1 className="animate-rise-delay mt-4 max-w-xl text-xl font-medium leading-snug text-ink-soft sm:text-3xl">
            {SITE.tagline}
          </h1>
          <p className="animate-rise-delay-2 mt-4 max-w-lg text-[15px] leading-relaxed text-ink-muted sm:text-lg">
            전문건설 사장이 매달 막히는 건 견적이 아니라{" "}
            <span className="font-medium text-ink">기성 승인</span>입니다. 그걸 고칩니다.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="sc-btn-primary px-6 py-3.5">
              데모로 기성 링크 만들기
            </Link>
            <Link href="/pricing" className="sc-btn-secondary px-6 py-3.5">
              월 4.9만부터
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-muted">카드 없이 · 데모 현장 3곳 · 승인 페이지 바로 열림</p>
        </div>

        <div className="animate-rise-delay sc-card p-5 sm:p-6">
          <p className="text-xs font-semibold tracking-wider text-steel-700">데모 미리보기</p>
          <p className="mt-2 font-display text-2xl text-ink">송파 오피스 · 기성 #4</p>
          <p className="mt-1 text-sm text-ink-muted">2026-07 · 승인 대기</p>
          <div className="mt-5 space-y-2 rounded-xl bg-ink px-4 py-4 text-sm text-white/90">
            <p>이번 청구 40,800,000원</p>
            <p>기청구 126,000,000원 · 유보 2,040,000원</p>
            <p className="pt-2 text-signal">실지급 요청 38,760,000원</p>
          </div>
          <div className="mt-4 flex gap-2">
            <span className="rounded-full bg-signal-soft px-3 py-1 text-xs font-semibold text-signal-ink">
              원청 승인 대기
            </span>
            <span className="rounded-full bg-steel-50 px-3 py-1 text-xs font-semibold text-steel-700">
              앱 설치 0
            </span>
          </div>
        </div>
      </section>

      <section className="border-y border-paper-line bg-paper-card/70 py-16">
        <div className="sc-container">
          <p className="text-xs font-semibold tracking-[0.16em] text-steel-700">왜 이 시장인가</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-medium text-ink sm:text-4xl">
            추가공사보다 큰 돈, 세무·전화보다 약한 상위호환.
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {pains.map((p) => (
              <article key={p.title} className="border-t border-ink/10 pt-5">
                <h3 className="text-lg font-medium text-ink">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="sc-container">
          <p className="text-xs font-semibold tracking-[0.16em] text-steel-700">작동</p>
          <h2 className="mt-3 font-display text-3xl font-medium text-ink sm:text-4xl">
            건설 ERP가 아니라, 기성 승인 OS입니다.
          </h2>
          <ol className="mt-10 space-y-8">
            {steps.map((s) => (
              <li key={s.n} className="grid gap-2 border-l-2 border-signal pl-5 md:grid-cols-[5rem_1fr]">
                <span className="font-display text-2xl text-steel-700">{s.n}</span>
                <div>
                  <h3 className="text-lg font-medium text-ink sm:text-xl">{s.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-paper-line bg-ink py-16 text-white">
        <div className="sc-container grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wider text-signal">정직한 한계</p>
            <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
              과장하지 않습니다. 이 조건에서만 이깁니다.
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-white/75">
              <li>· 공공 의무 하도급지킴이 현장은 ICP에서 뺍니다</li>
              <li>· Textura/Procore급 대형 상업현장은 엔터프라이즈 전쟁 — 비ICP</li>
              <li>· 한국 건설업체 8.9만 중 실제 월 기성 민간 SMB는 그보다 작음 (추정 1~2만)</li>
              <li>· 실패 모드: 원청이 링크를 안 누름 · “카톡으로 충분” · ERP 올인 요구</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold text-signal">월 1,000만 경로 (예)</p>
            <p className="mt-3 text-3xl font-display">127곳 × 7.9만</p>
            <p className="mt-2 text-sm text-white/65">
              민간 전문건설. 기성 1회 지연(수천만)이면 구독 ROI는 자명 — 전환은 영업이 관건.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="sc-container">
          <h2 className="font-display text-3xl font-medium text-ink">요금</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
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
                <p className="mt-3 font-display text-4xl">
                  {plan.priceLabel}
                  <span className={`ml-1 text-base font-sans ${plan.highlight ? "text-white/55" : "text-ink-muted"}`}>
                    원/월
                  </span>
                </p>
                <p className={`mt-2 text-sm ${plan.highlight ? "text-white/70" : "text-ink-muted"}`}>{plan.blurb}</p>
                <ul className={`mt-5 flex-1 space-y-2 text-sm ${plan.highlight ? "text-white/80" : "text-ink-muted"}`}>
                  {plan.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold ${
                    plan.highlight ? "bg-white text-ink" : "bg-steel-600 text-white hover:bg-steel-700"
                  }`}
                >
                  {plan.name}로 시작
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-paper-line bg-paper-card/80 py-12">
        <div className="sc-container flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl text-ink sm:text-3xl">오늘부터, 카톡 기성을 끊으세요.</h2>
            <p className="mt-2 text-sm text-ink-muted">데모에 미승인 기성이 이미 있습니다.</p>
          </div>
          <Link href="/signup" className="sc-btn-primary px-6 py-3.5">
            무료 데모
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
