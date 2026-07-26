import Link from "next/link";
import { HeroBoard3D } from "@/components/HeroBoard3D";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PRICING, SITE } from "@/lib/site";

const steps = [
  {
    n: "01",
    title: "거래처와 받을 자료를 적습니다",
    body: "상호·담당자·휴대폰·마감일·필요 자료(통장, 카드매출, 세금계산서 등)를 넣습니다. 휴대폰이 알림톡 도착 주소입니다.",
  },
  {
    n: "02",
    title: "거래처 휴대폰으로 알림톡이 갑니다",
    body: "등록한 번호의 카카오톡으로 ‘자료 제출 부탁드립니다’ 안내가 도착합니다. 사무원이 전화하던 그 내용입니다.",
  },
  {
    n: "03",
    title: "받은 곳·안 받은 곳만 남깁니다",
    body: "누가 냈는지 한눈에 보고, 안 낸 곳에만 다시 보냅니다. 엑셀 메모와 전화 목록이 필요 없습니다.",
  },
];

const pains = [
  {
    title: "매달 같은 전화를 반복합니다",
    body: "마감 전후 수임처마다 ‘자료 아직이세요?’를 돌립니다. 업무가 아니라 추심에 가까운 시간입니다.",
  },
  {
    title: "개인 카톡에 기록이 흩어집니다",
    body: "누가 몇 시에 뭐라고 답했는지 찾기 어렵고, 담당자가 바뀌면 인수인계도 깨집니다.",
  },
  {
    title: "사무원 인건비로 독촉을 사고 있습니다",
    body: "소형 사무소도 자료 회수에 주 수 시간을 씁니다. 구독료보다 인건비·사장 시간이 훨씬 큽니다.",
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
              수임처 자료 요청,
              <span className="block text-pine-700">사무원 대신 시스템이 합니다.</span>
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-lg text-[15px] leading-relaxed text-ink-muted sm:mt-5 sm:text-lg">
              기장 마감마다 반복되는 전화·카톡 독촉을 정보성 알림톡과 제출 현황판으로 바꿉니다.
              세무 판단은 사무소가, 쫓아다니는 일은 {SITE.name}가 맡습니다.
            </p>
            <div className="mt-7 flex w-full flex-col gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/signup" className="sc-btn-primary w-full px-6 py-3.5 sm:w-auto">
                데모 사무소로 14일 시작
              </Link>
              <Link href="/#how" className="sc-btn-secondary w-full px-6 py-3.5 sm:w-auto">
                3단계로 보기
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              카드 없이 데모 데이터로 현황판을 바로 확인할 수 있습니다.
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
              <p className="mt-2 font-display text-2xl font-medium text-ink">월 7.9~19.9만</p>
              <p className="mt-1 text-sm text-ink-muted">독촉·현황만 대체. 기장은 그대로.</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-pine-700">체감</p>
              <p className="mt-2 font-display text-2xl font-medium text-ink">마감 주 집중 완화</p>
              <p className="mt-1 text-sm text-ink-muted">미제출만 남기고 나머지는 자동.</p>
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

      <section id="board" className="scroll-mt-20 border-y border-paper-line bg-ink py-16 text-paper sm:py-20">
        <div className="sc-container grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-pine-200">현황판</p>
            <h2 className="mt-3 font-display text-[1.65rem] font-medium tracking-tight sm:text-4xl">
              고객이 매일 열어보는 화면은 이것뿐입니다.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-paper/70 sm:text-base">
              복잡한 CRM이 아닙니다. 이번 달 수임처별 제출 상태, 마지막 요청 시각, 필요한 자료 목록.
              사무장이 “오늘 누구한테 전화하지?”를 여기서 끝냅니다.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-paper/80">
              <li>· 지연 / 요청 중 / 완료를 색으로 구분</li>
              <li>· 미제출만 골라 재요청</li>
              <li>· 발송 로그·수신거부 기록 유지</li>
            </ul>
            <Link href="/signup" className="sc-btn mt-8 min-h-11 bg-paper text-ink hover:bg-white">
              현황판 데모 열기
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              {[
                { k: "지연", v: "1" },
                { k: "요청 중", v: "4" },
                { k: "제출완료", v: "3" },
              ].map((x) => (
                <div key={x.k} className="rounded-xl bg-black/25 px-2 py-4 sm:px-3">
                  <p className="text-[11px] text-paper/50 sm:text-xs">{x.k}</p>
                  <p className="mt-1 font-display text-2xl font-medium sm:text-3xl">{x.v}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-paper/55">
              알림톡은 수임 계약 이행을 위한 정보성 안내에 맞춰 템플릿 심사를 받습니다.
              광고성 반복 홍보는 하지 않습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="sc-container">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-pine-700">요금</p>
              <h2 className="mt-3 font-display text-[1.65rem] font-medium tracking-tight text-ink sm:text-4xl">
                인건비 대비 읽히는 가격.
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
            {PRICING.map((plan) => (
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
                <p className="mt-3 font-display text-3xl font-medium sm:text-4xl">
                  {plan.price}
                  <span
                    className={`ml-1 text-base font-sans font-medium ${
                      plan.highlight ? "text-paper/60" : "text-ink-muted"
                    }`}
                  >
                    원/월
                  </span>
                </p>
                <p className={`mt-2 text-sm ${plan.highlight ? "text-paper/70" : "text-ink-muted"}`}>
                  {plan.blurb} · {plan.clients}
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
                  {plan.cta}
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
                a: "수임체크는 전표·신고를 하지 않습니다. 수임처에 자료를 요청하고, 제출 여부를 추적하는 운영 도구입니다.",
              },
              {
                q: "카카오 알림톡이 광고로 막히지 않나요?",
                a: "수임 계약 이행을 위한 정보성 안내에 맞춰 템플릿 심사를 받습니다. 할인·이벤트 같은 광고 문구는 넣지 않는 것이 원칙입니다.",
              },
              {
                q: "자동수집 솔루션과 겹치나요?",
                a: "자동수집은 ‘가져오기’이고, 수임체크는 ‘아직 안 낸 곳을 요청하기’입니다. 소형 사무소는 먼저 독촉만 자동화하는 경우가 많습니다.",
              },
              {
                q: "데모에서 실제 문자가 나가나요?",
                a: "아니요. 데모는 현황판·수임처·CSV·문구 미리보기만 동작합니다. 실발송은 채널 심사·발신 프로필 등록 후 연동합니다.",
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
            <p className="mt-2 text-sm text-ink-muted">
              데모 수임처가 채워진 상태로 바로 들어갑니다.
            </p>
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
