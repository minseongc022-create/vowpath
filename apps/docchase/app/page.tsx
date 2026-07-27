import Link from "next/link";
import { HeroBoard3D } from "@/components/HeroBoard3D";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";

const steps = [
  {
    n: "01",
    title: "거래처와 받을 자료만 적습니다",
    body: "상호·담당자·휴대폰·마감일·필요 자료. 휴대폰이 알림톡 도착 주소입니다. 수임처에 앱을 깔라고 하지 않습니다.",
  },
  {
    n: "02",
    title: "알림톡 + 제출 링크가 갑니다",
    body: "사장은 카톡 안의 링크로 파일만 올립니다. ERP·회원가입·설치 없음. 사무원이 전화하던 그 한 문장입니다.",
  },
  {
    n: "03",
    title: "안 낸 곳만 다시 보냅니다",
    body: "받은 곳·안 받은 곳·파일 도착이 한 화면에. D-7/D-3/D-1 자동 독촉으로 마감 주 전화를 줄입니다.",
  },
];

const pains = [
  {
    title: "매달 같은 전화를 반복합니다",
    body: "마감 전후 수임처마다 ‘자료 아직이세요?’를 돌립니다. 업무가 아니라 추심에 가까운 시간입니다.",
  },
  {
    title: "자동수집은 무겁고, 전화는 싸구려가 아닙니다",
    body: "수집·기장 올인은 도입이 깁니다. 소형 사무소는 먼저 ‘안 낸 곳 쫓기’만 자동화하는 편이 빠릅니다.",
  },
  {
    title: "사무원 인건비로 독촉을 사고 있습니다",
    body: "자료 회수에 주 수 시간을 씁니다. 구독료보다 인건비·사장 시간이 훨씬 큽니다.",
  },
];

export default function HomePage() {
  return (
    <div className="bg-mesh-hero">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-50"
          aria-hidden
        />
        <div className="sc-container relative grid items-center gap-10 py-12 sm:gap-12 sm:py-16 lg:min-h-[78vh] lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="order-1">
            <p className="animate-rise font-display text-[2.35rem] font-medium leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {SITE.name}
            </p>
            <h1 className="animate-rise-delay mt-4 max-w-xl text-xl font-medium leading-snug tracking-tight text-ink-soft sm:mt-5 sm:text-3xl">
              {SITE.tagline}
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-lg text-[15px] leading-relaxed text-ink-muted sm:mt-5 sm:text-lg">
              기장 마감마다 반복되는 전화·카톡 독촉을 알림톡과 제출 링크로 바꿉니다. 수임처는 앱 없이
              파일만, 사무소는 현황판만 보면 됩니다.
            </p>
            <div className="mt-7 flex w-full flex-col gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/signup" className="sc-btn-primary w-full px-6 py-3.5 sm:w-auto">
                규모별 플랜으로 데모 시작
              </Link>
              <Link href="/pricing" className="sc-btn-secondary w-full px-6 py-3.5 sm:w-auto">
                월 4.9만부터 보기
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              카드 없이 · 라이트/스탠다드/프로 선택 · 데모 데이터로 바로 확인
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
            이미 인건비로 사고 있는 일을, 더 싸게·더 빠뜨리지 않게.
          </h2>
          <div className="mt-10 grid gap-8 sm:mt-12 md:grid-cols-3 md:gap-10">
            {pains.map((p) => (
              <article key={p.title} className="border-t border-ink/10 pt-5">
                <h3 className="text-lg font-medium text-ink">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-12 grid gap-4 rounded-2xl border border-pine-200 bg-pine-50/70 p-5 sm:mt-14 sm:grid-cols-3 sm:p-8">
            <div>
              <p className="text-xs font-semibold tracking-wider text-pine-700">비교 기준</p>
              <p className="mt-2 font-display text-2xl font-medium text-ink">사무원 월급</p>
              <p className="mt-1 text-sm text-ink-muted">구인 공고 기준 약 220만 원대~</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-pine-700">수임체크</p>
              <p className="mt-2 font-display text-2xl font-medium text-ink">월 4.9~17.9만</p>
              <p className="mt-1 text-sm text-ink-muted">독촉·제출 링크·현황만. 기장은 그대로.</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-pine-700">수임처 경험</p>
              <p className="mt-2 font-display text-2xl font-medium text-ink">앱 설치 0</p>
              <p className="mt-1 text-sm text-ink-muted">카톡 링크 → 파일 올리기 끝.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 py-16 sm:py-20">
        <div className="sc-container">
          <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">작동 방식</p>
          <h2 className="mt-3 font-display text-[1.65rem] font-medium tracking-tight text-ink sm:text-4xl">
            설치가 아니라, 이번 달 마감부터.
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
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="vs" className="scroll-mt-20 border-y border-paper-line bg-ink py-16 text-paper sm:py-20">
        <div className="sc-container">
          <p className="text-xs font-semibold tracking-[0.16em] text-pine-200">차별점</p>
          <h2 className="mt-3 max-w-2xl font-display text-[1.65rem] font-medium tracking-tight sm:text-4xl">
            자동수집 올인보다, 마감 독촉이 먼저입니다.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-pine-200">수임체크</p>
              <ul className="mt-4 space-y-2 text-sm text-paper/80">
                <li>· 수임처: 카톡 링크만 (앱·회원가입 없음)</li>
                <li>· 사무소: 오늘 독촉 목록 하나</li>
                <li>· 소형 4.9만 / 중형 9.9만 / 팀 17.9만</li>
                <li>· 알림톡 포함 + 초과만 얇게 과금</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <p className="text-sm font-semibold text-paper/55">무거운 수집·기장 올인</p>
              <ul className="mt-4 space-y-2 text-sm text-paper/55">
                <li>· 수임처에 연동·앱·교육을 요구하기 쉬움</li>
                <li>· 도입·온보딩이 길고 기능이 넓음</li>
                <li>· “아직 안 낸 곳만 쫓기”가 묻히기 쉬움</li>
                <li>· 소형 사무소엔 과한 경우가 많음</li>
              </ul>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-paper/60">
            수집이 필요해지면 나중에 붙이면 됩니다. 지금 당장 아픈 건 마감 전 전화 목록입니다.
          </p>
        </div>
      </section>

      <section id="board" className="scroll-mt-20 py-16 sm:py-20">
        <div className="sc-container grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">현황판</p>
            <h2 className="mt-3 font-display text-[1.65rem] font-medium tracking-tight text-ink sm:text-4xl">
              고객이 매일 열어보는 화면은 이것뿐입니다.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted sm:text-base">
              복잡한 CRM이 아닙니다. 이번 달 제출 상태, 마지막 요청, 도착한 파일.
              사무장이 “오늘 누구한테 연락하지?”를 여기서 끝냅니다.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-ink-muted">
              <li>· 늦음 / 보냄 / 받음을 색으로 구분</li>
              <li>· 미제출만 골라 재요청 · 한꺼번에 보내기</li>
              <li>· 제출 링크로 파일이 바로 들어옴</li>
            </ul>
            <Link href="/signup" className="sc-btn-primary mt-8 inline-flex min-h-11 px-6">
              현황판 데모 열기
            </Link>
          </div>
          <div className="rounded-2xl border border-paper-line bg-paper-card p-5 shadow-soft">
            <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
              {[
                { k: "늦음", v: "1" },
                { k: "연락할 곳", v: "4" },
                { k: "자료 받음", v: "3" },
              ].map((x) => (
                <div key={x.k} className="rounded-xl bg-paper px-2 py-4 sm:px-3">
                  <p className="text-[11px] text-ink-muted sm:text-xs">{x.k}</p>
                  <p className="mt-1 font-display text-2xl font-medium text-ink sm:text-3xl">{x.v}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-ink-muted">
              알림톡은 수임 계약 이행을 위한 정보성 안내에 맞춰 템플릿 심사를 받습니다.
              광고성 반복 홍보는 하지 않습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-paper-line py-16 sm:py-20">
        <div className="sc-container">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">요금</p>
              <h2 className="mt-3 font-display text-[1.65rem] font-medium tracking-tight text-ink sm:text-4xl">
                소형·중형·팀, 각자 맞는 플랜.
              </h2>
            </div>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-pine-700 hover:text-pine-800"
            >
              요금 자세히 →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`flex flex-col rounded-2xl border p-5 sm:p-6 ${
                  plan.highlight
                    ? "border-pine-600 bg-ink text-paper shadow-soft"
                    : "border-paper-line bg-paper-card"
                }`}
              >
                <p className={`text-sm font-semibold ${plan.highlight ? "text-pine-200" : "text-pine-700"}`}>
                  {plan.name}
                </p>
                <p className="mt-1 text-xs opacity-80">{plan.audience}</p>
                <p className="mt-3 font-display text-3xl font-medium sm:text-4xl">
                  {plan.priceLabel}
                  <span
                    className={`ml-1 text-base font-sans font-medium ${
                      plan.highlight ? "text-paper/60" : "text-ink-muted"
                    }`}
                  >
                    원/월
                  </span>
                </p>
                <p className={`mt-2 text-sm ${plan.highlight ? "text-paper/70" : "text-ink-muted"}`}>
                  {plan.blurb}
                </p>
                <ul
                  className={`mt-5 flex-1 space-y-2 text-sm ${
                    plan.highlight ? "text-paper/80" : "text-ink-muted"
                  }`}
                >
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold active:scale-[0.98] ${
                    plan.highlight
                      ? "bg-paper text-ink hover:bg-white"
                      : "bg-pine-700 text-white hover:bg-pine-800"
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
          <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">자주 묻는 질문</p>
          <h2 className="mt-3 font-display text-[1.65rem] font-medium tracking-tight text-ink sm:text-4xl">
            도입 전에 확인하세요
          </h2>
          <dl className="mt-8 space-y-7 sm:mt-10 sm:space-y-8">
            {[
              {
                q: "기장·세무 프로그램과 뭐가 다른가요?",
                a: "수임체크는 전표·신고를 하지 않습니다. 수임처에 자료를 요청하고, 제출·파일 도착을 추적하는 운영 도구입니다.",
              },
              {
                q: "자동수집(클로브 등)과 겹치나요?",
                a: "자동수집은 ‘가져오기’, 수임체크는 ‘아직 안 낸 곳을 요청하기’입니다. 수임처에 앱을 요구하지 않고, 카톡 링크로 끝내는 쪽이 도입이 빠릅니다.",
              },
              {
                q: "카카오 알림톡이 광고로 막히지 않나요?",
                a: "수임 계약 이행을 위한 정보성 안내에 맞춰 템플릿 심사를 받습니다. 할인·이벤트 같은 광고 문구는 넣지 않는 것이 원칙입니다.",
              },
              {
                q: "데모에서 실제 문자가 나가나요?",
                a: "아니요. 데모는 현황판·제출 링크·CSV·문구 미리보기만 동작합니다. 실발송은 채널 심사·발신 프로필 등록 후 연동합니다.",
              },
            ].map((item) => (
              <div key={item.q} className="border-t border-paper-line pt-5 sm:pt-6">
                <dt className="text-base font-medium text-ink">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-paper-line bg-paper-card/70 py-12 sm:py-16">
        <div className="sc-container flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div>
            <h2 className="font-display text-xl font-medium text-ink sm:text-3xl">
              이번 달 마감부터, 독촉 목록을 비워 보세요.
            </h2>
            <p className="mt-2 text-sm text-ink-muted">규모에 맞는 플랜으로 데모 수임처가 채워진 채 들어갑니다.</p>
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
