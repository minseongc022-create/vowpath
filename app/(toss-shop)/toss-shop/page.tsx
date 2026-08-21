import Link from "next/link";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";

const FEATURES = [
  {
    title: "베스트셀러 랭킹 & 가격 추적",
    desc: "카테고리별 순위·가격이 1분마다 갱신됩니다. 관심 상품을 등록하면 거의 실시간으로 변동을 확인할 수 있습니다.",
    href: SP_ROUTES.rankings,
  },
  {
    title: "키워드 분석",
    desc: "검색량, 경쟁 상품 수, 평균 가격, 상위 노출 상품을 분석합니다. 연관 키워드 제안으로 SEO 전략을 세울 수 있습니다.",
    href: SP_ROUTES.keywords,
  },
  {
    title: "경쟁사 모니터링 알림",
    desc: "경쟁 셀러의 가격·랭킹 변동을 1분마다 감지하고 알림을 보냅니다.",
    href: SP_ROUTES.competitors,
  },
  {
    title: "정산 대조 도구",
    desc: "토스쇼핑 정산 API·CSV로 예상 정산금과 실제 입금액을 대조합니다.",
    href: SP_ROUTES.settlements,
  },
];

export default function SellerPulseHomePage() {
  return (
    <>
      <section className="border-b border-ts-border bg-gradient-to-br from-ts-primary/5 via-white to-blue-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-sm font-semibold text-ts-primary">
            {SP_STRINGS.brand} · {SP_STRINGS.brandEn}
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-ts-ink sm:text-5xl">
            {SP_STRINGS.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ts-muted">{SP_STRINGS.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={SP_ROUTES.login} className="ts-btn-primary px-6 py-3">
              {SP_STRINGS.ctaStart}
            </Link>
            <Link href={SP_ROUTES.login} className="ts-btn-secondary px-6 py-3">
              {SP_STRINGS.ctaDemo}
            </Link>
          </div>
          <p className="mt-4 text-xs text-ts-muted">
            데모: {SP_STRINGS.demoEmail} / {SP_STRINGS.demoPassword}
          </p>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold text-ts-ink">4가지 핵심 도구</h2>
        <p className="mt-1 text-sm text-ts-muted">{SP_STRINGS.syncInterval}</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {FEATURES.map((f) => (
            <Link key={f.title} href={f.href} className="ts-card block transition hover:shadow-md">
              <h3 className="font-bold text-ts-ink">{f.title}</h3>
              <p className="mt-2 text-sm text-ts-muted">{f.desc}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-ts-primary">
                바로가기 →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
