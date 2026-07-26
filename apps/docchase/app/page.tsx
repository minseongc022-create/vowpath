import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PRICING, SITE } from "@/lib/site";

const steps = [
  {
    n: "01",
    title: "수임처와 받을 자료를 등록합니다",
    body: "상호·담당자·연락처·마감일·필요 자료(통장, 카드매출, 세금계산서 등)를 CSV 또는 화면에서 넣습니다.",
  },
  {
    n: "02",
    title: "마감 일정에 맞춰 요청이 나갑니다",
    body: "D-7 · D-3 · D-1 등 사무소 규칙대로 정보성 알림톡이 발송됩니다. 이미 제출한 곳은 자동 제외됩니다.",
  },
  {
    n: "03",
    title: "현황판에서 미제출만 봅니다",
    body: "누가 냈고 누가 안 냈는지, 몇 차까지 갔는지 한 화면입니다. 전화로 쫓아다니는 목록 정리가 사라집니다.",
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

const demoRows = [
  { name: "한빛카페 성수점", status: "지연", tone: "rose" },
  { name: "동행건설", status: "2차 요청", tone: "amber" },
  { name: "미르한의원", status: "1차 요청", tone: "pine" },
  { name: "오픈로지스", status: "제출완료", tone: "done" },
];

export default function HomePage() {
  return (
    <div className="bg-mesh-hero">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-60"
          aria-hidden
        />
        <div className="sc-container relative grid min-h-[78vh] items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p className="animate-rise font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {SITE.name}
            </p>
            <h1 className="animate-rise-delay mt-5 max-w-xl text-2xl font-semibold leading-snug tracking-tight text-ink-soft sm:text-3xl">
              수임처 자료 요청,
              <span className="block text-pine-700">사무원 대신 시스템이 합니다.</span>
            </h1>
            <p className="animate-rise-delay-2 mt-5 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg">
              기장 마감마다 반복되는 전화·카톡 독촉을 정보성 알림톡과 제출 현황판으로 바꿉니다.
              세무 판단은 사무소가, 쫓아다니는 일은 {SITE.name}가 맡습니다.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="sc-btn-primary px-6 py-3">
                데모 사무소로 14일 시작
              </Link>
              <Link href="/#how" className="sc-btn-secondary px-6 py-3">
                3단계로 보기
              </Link>
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              카드 없이 데모 데이터로 현황판을 바로 확인할 수 있습니다.
            </p>
          </div>

          <div className="animate-rise-delay relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-pine-500/10 blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[1.6rem] border border-ink/10 bg-ink text-paper shadow-soft">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-paper/50">이번 달 마감</p>
                  <p className="mt-1 font-display text-xl">바른세무회계 · 7월</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-paper/50">회수율</p>
                  <p className="font-display text-2xl text-pine-200">63%</p>
                </div>
              </div>
              <ul className="divide-y divide-white/8">
                {demoRows.map((row, i) => (
                  <li
                    key={row.name}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 animate-slide-in"
                    style={{ animationDelay: `${0.08 * i}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          row.tone === "rose"
                            ? "bg-rose-300 animate-pulse-dot"
                            : row.tone === "amber"
                              ? "bg-amber-300"
                              : row.tone === "done"
                                ? "bg-pine-300"
                                : "bg-teal-200"
                        }`}
                      />
                      <span className="text-sm font-medium">{row.name}</span>
                    </div>
                    <span className="text-xs text-paper/65">{row.status}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-white/10 px-5 py-4 text-xs leading-relaxed text-paper/55">
                지연 1곳 · 요청 중 2곳 · 완료 1곳 — 전화 목록 없이 미제출만 처리합니다.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="border-y border-paper-line bg-paper-card/60 py-20">
        <div className="sc-container">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine-700">왜 필요한가</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            이미 인건비로 사고 있는 일을, 더 싸게·더 빠뜨리지 않게.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {pains.map((p) => (
              <article key={p.title} className="border-t border-ink/10 pt-5">
                <h3 className="text-lg font-semibold text-ink">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-14 grid gap-4 rounded-2xl border border-pine-200 bg-pine-50/70 p-6 sm:grid-cols-3 sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-pine-700">비교 기준</p>
              <p className="mt-2 font-display text-2xl text-ink">사무원 월급</p>
              <p className="mt-1 text-sm text-ink-muted">구인 공고 기준 약 220만 원대~</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-pine-700">수임체크</p>
              <p className="mt-2 font-display text-2xl text-ink">월 7.9~19.9만</p>
              <p className="mt-1 text-sm text-ink-muted">독촉·현황만 대체. 기장은 그대로.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-pine-700">체감</p>
              <p className="mt-2 font-display text-2xl text-ink">마감 주 집중 완화</p>
              <p className="mt-1 text-sm text-ink-muted">미제출만 남기고 나머지는 자동.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="py-20">
        <div className="sc-container">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine-700">작동 방식</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            설치가 아니라, 이번 달 마감부터.
          </h2>
          <ol className="mt-12 space-y-8">
            {steps.map((s) => (
              <li key={s.n} className="grid gap-3 border-l-2 border-pine-500/40 pl-6 md:grid-cols-[5rem_1fr] md:gap-8">
                <span className="font-display text-2xl text-pine-700">{s.n}</span>
                <div>
                  <h3 className="text-xl font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="board" className="border-y border-paper-line bg-ink py-20 text-paper">
        <div className="sc-container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine-200">현황판</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              고객이 매일 열어보는 화면은 이것뿐입니다.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-paper/70">
              복잡한 CRM이 아닙니다. 이번 달 수임처별 제출 상태, 마지막 요청 시각, 필요한 자료 목록.
              사무장이 “오늘 누구한테 전화하지?”를 여기서 끝냅니다.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-paper/80">
              <li>· 지연 / 요청 중 / 완료를 색으로 구분</li>
              <li>· 미제출만 골라 재요청</li>
              <li>· 발송 로그·수신거부 기록 유지</li>
            </ul>
            <Link href="/signup" className="sc-btn mt-8 bg-paper text-ink hover:bg-white">
              현황판 데모 열기
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { k: "지연", v: "1" },
                { k: "요청 중", v: "4" },
                { k: "제출완료", v: "3" },
              ].map((x) => (
                <div key={x.k} className="rounded-xl bg-black/25 px-3 py-4">
                  <p className="text-xs text-paper/50">{x.k}</p>
                  <p className="mt-1 font-display text-3xl">{x.v}</p>
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

      <section className="py-20">
        <div className="sc-container">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine-700">요금</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
                인건비 대비 읽히는 가격.
              </h2>
            </div>
            <Link href="/pricing" className="text-sm font-semibold text-pine-700 hover:text-pine-800">
              요금 자세히 →
            </Link>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PRICING.map((plan) => (
              <article
                key={plan.id}
                className={`rounded-2xl border p-6 ${
                  plan.highlight
                    ? "border-pine-600 bg-ink text-paper shadow-soft"
                    : "border-paper-line bg-paper-card"
                }`}
              >
                <p className={`text-sm font-semibold ${plan.highlight ? "text-pine-200" : "text-pine-700"}`}>
                  {plan.name}
                </p>
                <p className="mt-3 font-display text-4xl font-semibold">
                  {plan.price}
                  <span className={`ml-1 text-base font-sans font-medium ${plan.highlight ? "text-paper/60" : "text-ink-muted"}`}>
                    원/월
                  </span>
                </p>
                <p className={`mt-2 text-sm ${plan.highlight ? "text-paper/70" : "text-ink-muted"}`}>
                  {plan.blurb} · {plan.clients}
                </p>
                <ul className={`mt-6 space-y-2 text-sm ${plan.highlight ? "text-paper/80" : "text-ink-muted"}`}>
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 inline-flex w-full justify-center rounded-md px-4 py-2.5 text-sm font-semibold ${
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

      <section className="border-t border-paper-line py-20">
        <div className="sc-container max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine-700">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
            도입 전에 자주 묻는 것
          </h2>
          <dl className="mt-10 space-y-8">
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
                q: "Clobe 같은 자동수집과 겹치나요?",
                a: "자동수집은 ‘가져오기’이고, 수임체크는 ‘아직 안 낸 곳을 요청하기’입니다. 소형 사무소는 먼저 독촉만 자동화하는 경우가 많습니다.",
              },
              {
                q: "데모에서 실제 문자가 나가나요?",
                a: "아니요. 데모는 현황판·수임처·CSV·문구 미리보기만 동작합니다. 실발송은 채널 심사·발신 프로필 등록 후 연동합니다.",
              },
            ].map((item) => (
              <div key={item.q} className="border-t border-paper-line pt-6">
                <dt className="text-base font-semibold text-ink">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-paper-line bg-paper-card/70 py-16">
        <div className="sc-container flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              이번 달 마감부터, 독촉 목록을 비워 보세요.
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              데모 수임처가 채워진 상태로 바로 들어갑니다. 실제 발송 연동은 온보딩에서 설정합니다.
            </p>
          </div>
          <Link href="/signup" className="sc-btn-primary px-6 py-3">
            무료 데모 시작
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
