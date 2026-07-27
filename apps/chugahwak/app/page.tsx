import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";

const pains = [
  {
    title: "돈은 추가공사에서 새는데, 합의는 카톡에 있습니다",
    body: "구두·카톡 지시로 시공하면 나중에 ‘그건 원래 포함’이라고 합니다. 법원도 서면 합의를 봅니다.",
  },
  {
    title: "Jobber·Housecall도 변경합의는 애매합니다",
    body: "해외 현장관리 툴은 스케줄·청구는 잘하는데, 변경합의(CO) 전용 흐름이 없거나 비쌉니다. 한국 ERP는 너무 무겁습니다.",
  },
  {
    title: "클로브 같은 무료 거인이 이 카테고리를 안 잡습니다",
    body: "자동수집·기장 올인이 아닙니다. ‘추가 금액에 고객 서명을 받는’ 한 가지 일에 대장 자리가 비어 있습니다.",
  },
];

const steps = [
  {
    n: "01",
    title: "현장·금액·사유를 적습니다",
    body: "품목·수량·단가·공기연장을 넣습니다. 사진 메모도 남깁니다.",
  },
  {
    n: "02",
    title: "고객에게 승인 링크를 보냅니다",
    body: "앱 설치 없음. 카톡/문자로 링크만. 고객은 금액 보고 승인·거절.",
  },
  {
    n: "03",
    title: "승인액이 바로 대장에 쌓입니다",
    body: "미승인·승인·거절을 한눈에. 나중에 ‘합의 없었음’이 안 됩니다.",
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
            인테리어·개보수 사장이 매달 놓치는 건 스케줄이 아니라{" "}
            <span className="font-medium text-ink">서명 없는 추가공사</span>입니다. 그걸 고칩니다.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="sc-btn-primary px-6 py-3.5">
              데모로 합의 링크 만들기
            </Link>
            <Link href="/pricing" className="sc-btn-secondary px-6 py-3.5">
              월 3.9만부터
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-muted">카드 없이 · 데모 현장 3곳 · 승인 페이지 바로 열림</p>
        </div>

        <div className="animate-rise-delay sc-card p-5 sm:p-6">
          <p className="text-xs font-semibold tracking-wider text-steel-700">데모 미리보기</p>
          <p className="mt-2 font-display text-2xl text-ink">성수 카페 · CO #1</p>
          <p className="mt-1 text-sm text-ink-muted">바 카운터 석재 변경 · 대기 중</p>
          <div className="mt-5 space-y-2 rounded-xl bg-ink px-4 py-4 text-sm text-white/90">
            <p>천연대리석 상판 3.2㎡</p>
            <p>철거·재시공 노무 1식</p>
            <p className="pt-2 text-signal">합계 1,346,000원 · 공기 +3일</p>
          </div>
          <div className="mt-4 flex gap-2">
            <span className="rounded-full bg-signal-soft px-3 py-1 text-xs font-semibold text-signal-ink">
              고객 승인 대기
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
            돈은 흐르는데, 도구는 엉망입니다.
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
            견적 ERP가 아니라, 합의 OS입니다.
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
            <p className="text-xs font-semibold tracking-wider text-signal">증거</p>
            <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
              전 세계 불평 + 한국 판례가 같은 말을 합니다.
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-white/75">
              <li>· Jobber: “변경합의(CO) 워크플로가 없다” — GC 리뷰 핵심 불만</li>
              <li>· Buildertrend: 비싸고 무거움 · 소형 인테리어엔 과함</li>
              <li>· 한국: 추가공사대금은 서면·명시 합의가 없으면 청구가 깨짐 (판례 다수)</li>
              <li>· 실무: 카톡·견적서만 보내고 서명 없이 시공 → 분쟁</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold text-signal">월 1,000만 경로 (예)</p>
            <p className="mt-3 text-3xl font-display">145곳 × 6.9만</p>
            <p className="mt-2 text-sm text-white/65">
              소형 인테리어·개보수. 놓친 추가공사 1건(50만)이면 구독 1년치 ROI.
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
            <h2 className="font-display text-2xl text-ink sm:text-3xl">오늘부터, 서명 없는 추가공사를 끊으세요.</h2>
            <p className="mt-2 text-sm text-ink-muted">데모에 미승인 CO가 이미 있습니다.</p>
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
