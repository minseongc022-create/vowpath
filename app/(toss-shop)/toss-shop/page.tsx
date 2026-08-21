import Link from "next/link";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";

const FEATURES = [
  {
    icon: "📊",
    title: "랭킹·가격 추적",
    desc: "카테고리별 베스트셀러 순위와 가격 변동을 한눈에 확인하고, 관심 상품을 등록해 알림을 받으세요.",
  },
  {
    icon: "🔍",
    title: "키워드 분석",
    desc: "검색량·경쟁 상품 수·평균 가격·상위 노출 상품을 분석하고 연관 키워드로 SEO 전략을 세우세요.",
  },
  {
    icon: "🔔",
    title: "경쟁사 모니터링",
    desc: "경쟁 셀러의 가격·랭킹 변동을 추적하고, 조건에 맞는 알림을 받으세요.",
  },
  {
    icon: "💰",
    title: "정산 대조",
    desc: "토스쇼핑 정산 API·CSV로 예상 정산금과 실제 입금액을 대조해 누락·오차를 찾으세요.",
  },
];

const STEPS = [
  { step: "1", title: "토스 셀러 연동", desc: "셀러센터 API 키로 한 번에 연결" },
  { step: "2", title: "데이터 자동 수집", desc: "상품·정산·키워드가 대시보드에 모입니다" },
  { step: "3", title: "의사결정", desc: "랭킹·가격·경쟁사 인사이트로 판매 전략 수립" },
];

export default function SellerPulseHomePage() {
  return (
    <>
      <section className="border-b border-ts-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="text-sm font-semibold text-ts-primary">
            {SP_STRINGS.brand} · {SP_STRINGS.brandEn}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-ts-ink sm:text-5xl">
            {SP_STRINGS.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ts-muted sm:text-lg">
            {SP_STRINGS.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={SP_ROUTES.login} className="ts-btn-primary px-8 py-3 text-center">
              {SP_STRINGS.ctaStart}
            </Link>
            <Link href={SP_ROUTES.login} className="ts-btn-secondary px-8 py-3 text-center">
              {SP_STRINGS.ctaDemo}
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <h2 className="text-xl font-bold text-ts-ink sm:text-2xl">무엇을 할 수 있나요?</h2>
        <p className="mt-2 max-w-2xl text-sm text-ts-muted">
          아이템스카우트·셀러라이프 같은 셀러 분석 도구에서 필요한 기능을 토스쇼핑에 맞게 모았습니다.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="ts-card-hover">
              <span className="text-2xl" aria-hidden>{f.icon}</span>
              <h3 className="mt-3 font-bold text-ts-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ts-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-ts-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
          <h2 className="text-xl font-bold text-ts-ink sm:text-2xl">시작 방법</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.step} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ts-primary/10 text-sm font-bold text-ts-primary">
                  {s.step}
                </span>
                <div>
                  <p className="font-bold text-ts-ink">{s.title}</p>
                  <p className="mt-1 text-sm text-ts-muted">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 text-center sm:py-16">
        <h2 className="text-xl font-bold text-ts-ink sm:text-2xl">지금 바로 시작하세요</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ts-muted">
          토스 셀러 API 키로 연동하거나, 데모 계정으로 모든 기능을 체험할 수 있습니다.
        </p>
        <Link href={SP_ROUTES.login} className="ts-btn-primary mt-6 inline-flex px-8 py-3">
          {SP_STRINGS.ctaTossConnect}
        </Link>
      </section>
    </>
  );
}
