import Link from "next/link";
import { HeroBoard3D } from "@/components/HeroBoard3D";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";

const steps = [
  {
    n: "01",
    title: "알림톡으로 요청합니다",
    body: "거래처 휴대폰 → 카카오 알림톡. 제출 링크와 ‘이미냈어요’ 원탭 링크가 함께 갑니다. 앱 설치 없음.",
  },
  {
    n: "02",
    title: "수임처가 원탭으로 답합니다",
    body: "파일 올리기 · 이미 냈어요 · 이번 달 해당 없음. 전화 전에 상태가 현황판에 반영됩니다.",
  },
  {
    n: "03",
    title: "남은 곳만 전화 잔여 큐",
    body: "알림톡·원탭으로도 안 된 곳만 스크립트와 함께 남습니다. 전 수임처에 전화 돌리지 않습니다.",
  },
];

const pains = [
  {
    title: "자동수집 올인은 무겁습니다",
    body: "연동·교육·수임처 앱까지 가면 소형 사무소는 지칩니다. 당장 아픈 건 ‘아직 안 낸 곳’입니다.",
  },
  {
    title: "문자만 보내면 끝이 아닙니다",
    body: "보냈는지·받았는지·전화할지 엑셀에 흩어집니다. 마감은 오케스트레이션이 필요합니다.",
  },
  {
    title: "사무원 인건비로 독촉을 삽니다",
    body: "월 2.9만~이면 인건비 대비 부담이 작습니다. 구독 마진은 소프트웨어에, 알림톡은 포함팩으로.",
  },
];

export default function HomePage() {
  return (
    <div className="bg-mesh-hero">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-50" aria-hidden />
        <div className="sc-container relative grid items-center gap-10 py-12 sm:gap-12 sm:py-16 lg:min-h-[78vh] lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="order-1">
            <p className="animate-rise font-display text-[2.35rem] font-medium leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {SITE.name}
            </p>
            <h1 className="animate-rise-delay mt-4 max-w-xl text-xl font-medium leading-snug tracking-tight text-ink-soft sm:mt-5 sm:text-3xl">
              {SITE.tagline}
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-lg text-[15px] leading-relaxed text-ink-muted sm:mt-5 sm:text-lg">
              클로브형 자동수집이 아닙니다. 소형 세무소의{" "}
              <span className="font-medium text-ink">마감 독촉만</span> 끝까지 닫는 OS입니다.
            </p>
            <div className="mt-7 flex w-full flex-col gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/signup" className="sc-btn-primary w-full px-6 py-3.5 sm:w-auto">
                월 2.9만부터 데모
              </Link>
              <Link href="/pricing" className="sc-btn-secondary w-full px-6 py-3.5 sm:w-auto">
                플랜 보기
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              카드 없이 · 솔라피 키 없으면 연습 모드 · 제출·원탭·전화큐는 바로 체험
            </p>
          </div>
          <div className="order-2 animate-rise-delay pb-4 lg:pb-0">
            <HeroBoard3D />
          </div>
        </div>
      </section>

      <section id="why" className="scroll-mt-20 border-y border-paper-line bg-paper-card/60 py-16 sm:py-20">
        <div className="sc-container">
          <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">왜 필요한가</p>
          <h2 className="mt-3 max-w-2xl font-display text-[1.65rem] font-medium tracking-tight text-ink sm:text-4xl">
            소형 세무소가 매달 하는 일 — 독촉을 시스템으로.
          </h2>
          <div className="mt-10 grid gap-8 sm:mt-12 md:grid-cols-3 md:gap-10">
            {pains.map((p) => (
              <article key={p.title} className="border-t border-ink/10 pt-5">
                <h3 className="text-lg font-medium text-ink">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 py-16 sm:py-20">
        <div className="sc-container">
          <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">우리만의 루프</p>
          <h2 className="mt-3 font-display text-[1.65rem] font-medium tracking-tight text-ink sm:text-4xl">
            알림톡 → 원탭 → 전화 잔여. 이 세 단계가 차별점입니다.
          </h2>
          <ol className="mt-10 space-y-8 sm:mt-12">
            {steps.map((s) => (
              <li
                key={s.n}
                className="grid gap-3 border-l-2 border-pine-500/40 pl-5 sm:pl-6 md:grid-cols-[5rem_1fr] md:gap-8"
              >
                <span className="font-display text-2xl font-medium text-pine-700">{s.n}</span>
                <div>
                  <h3 className="text-lg font-medium text-ink sm:text-xl">{s.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="vs" className="scroll-mt-20 border-y border-paper-line bg-ink py-16 text-paper sm:py-20">
        <div className="sc-container">
          <p className="text-xs font-semibold tracking-[0.16em] text-pine-200">클로브와 다릅니다</p>
          <h2 className="mt-3 max-w-2xl font-display text-[1.65rem] font-medium tracking-tight sm:text-4xl">
            기능이 비슷한 게 아닙니다. 하는 일이 다릅니다.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-pine-200">수임체크 = 마감 독촉 OS</p>
              <ul className="mt-4 space-y-2 text-sm text-paper/80">
                <li>· 수임처 앱 0 · 카톡 링크만</li>
                <li>· 원탭 ‘이미냈어요 / 해당없음’</li>
                <li>· 남은 곳만 전화 큐 + 스크립트</li>
                <li>· 월 2.9만~ · 알림톡 포함</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <p className="text-sm font-semibold text-paper/55">자동수집·기장 올인</p>
              <ul className="mt-4 space-y-2 text-sm text-paper/55">
                <li>· 가져오기·연동·교육이 중심</li>
                <li>· 수임처 쪽에 앱/연동 부담이 생기기 쉬움</li>
                <li>· ‘안 낸 곳만 쫓기’가 제품의 한가운데가 아님</li>
                <li>· 소형 사무소엔 과한 경우가 많음</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-paper-line py-16 sm:py-20">
        <div className="sc-container">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">요금</p>
              <h2 className="mt-3 font-display text-[1.65rem] font-medium tracking-tight text-ink sm:text-4xl">
                가격은 싸게, 마진은 구독에.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-ink-muted">
                알림톡 원가≈13원. 포함팩 COGS는 수천 원대, 구독이 본마진. 초과만 29~39원.
              </p>
            </div>
            <Link href="/pricing" className="inline-flex min-h-11 items-center text-sm font-semibold text-pine-700">
              요금 자세히 →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-10 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`flex flex-col rounded-2xl border p-5 sm:p-6 ${
                  plan.highlight ? "border-pine-600 bg-ink text-paper shadow-soft" : "border-paper-line bg-paper-card"
                }`}
              >
                <p className={`text-sm font-semibold ${plan.highlight ? "text-pine-200" : "text-pine-700"}`}>
                  {plan.name}
                </p>
                <p className="mt-1 text-xs opacity-80">{plan.audience}</p>
                <p className="mt-3 font-display text-3xl font-medium sm:text-4xl">
                  {plan.priceLabel}
                  <span className={`ml-1 text-base font-sans ${plan.highlight ? "text-paper/60" : "text-ink-muted"}`}>
                    원/월
                  </span>
                </p>
                <p className={`mt-2 text-sm ${plan.highlight ? "text-paper/70" : "text-ink-muted"}`}>{plan.blurb}</p>
                <ul className={`mt-5 flex-1 space-y-2 text-sm ${plan.highlight ? "text-paper/80" : "text-ink-muted"}`}>
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold ${
                    plan.highlight ? "bg-paper text-ink hover:bg-white" : "bg-pine-700 text-white hover:bg-pine-800"
                  }`}
                >
                  {plan.name}로 시작
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-paper-line py-16 sm:py-20">
        <div className="sc-container max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">FAQ</p>
          <dl className="mt-8 space-y-7">
            {[
              {
                q: "클로브랑 기능이 비슷한 거 아닌가요?",
                a: "아니요. 클로브류는 자동수집·기장 쪽이 중심입니다. 수임체크는 ‘안 낸 곳을 알림톡→원탭→전화큐로 닫는’ 마감 독촉 OS입니다. 겹치는 듯해도 JTBD가 다릅니다.",
              },
              {
                q: "알림톡은 어떻게 나가나요?",
                a: "솔라피 연동입니다. 키를 넣으면 실발송, 없으면 연습 모드입니다. 설정 화면에서 상태를 확인하세요.",
              },
              {
                q: "수임처에 뭘 설치하나요?",
                a: "없습니다. 카톡 링크 두 개(제출 / 원탭 회신)만 씁니다.",
              },
            ].map((item) => (
              <div key={item.q} className="border-t border-paper-line pt-5">
                <dt className="text-base font-medium text-ink">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-paper-line bg-paper-card/70 py-12 sm:py-16">
        <div className="sc-container flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-medium text-ink sm:text-3xl">이번 달 마감, 전화 목록을 줄여 보세요.</h2>
            <p className="mt-2 text-sm text-ink-muted">데모에 전화 잔여 큐까지 채워 두었습니다.</p>
          </div>
          <Link href="/signup" className="sc-btn-primary w-full shrink-0 px-6 py-3.5 sm:w-auto">
            무료 데모 시작
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
