import Link from "next/link";
import { TS_STRINGS } from "@/toss-shop/lib/strings";

const FEATURES = [
  {
    title: "베스트셀러 랭킹 & 가격 추적",
    desc: "카테고리별 순위 변동과 가격 히스토리를 추적합니다. 관심 상품을 등록하면 변동을 모니터링할 수 있습니다.",
    href: "/toss-shop/dashboard/rankings",
  },
  {
    title: "키워드 분석",
    desc: "검색량, 경쟁 상품 수, 평균 가격, 상위 노출 상품을 분석합니다. 연관 키워드 제안으로 SEO 전략을 세울 수 있습니다.",
    href: "/toss-shop/dashboard/keywords",
  },
  {
    title: "경쟁사 모니터링 알림",
    desc: "경쟁 셀러의 가격·랭킹 변동을 자동 감지하고 알림을 보냅니다. 규칙 기반으로 원하는 조건만 추적합니다.",
    href: "/toss-shop/dashboard/competitors",
  },
  {
    title: "정산 대조 도구",
    desc: "토스쇼핑 정산 CSV를 가져와 예상 정산금과 실제 입금액을 대조합니다. 불일치 건을 자동으로 표시합니다.",
    href: "/toss-shop/dashboard/settlements",
  },
];

export default function TossShopHomePage() {
  return (
    <>
      <section className="border-b border-ts-border bg-gradient-to-br from-ts-primary/5 via-white to-blue-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-sm font-semibold text-ts-primary">토스쇼핑 셀러 전용</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-ts-ink sm:text-5xl">
            {TS_STRINGS.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ts-muted">{TS_STRINGS.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/toss-shop/login" className="ts-btn-primary px-6 py-3">
              {TS_STRINGS.ctaStart}
            </Link>
            <Link href="/toss-shop/login" className="ts-btn-secondary px-6 py-3">
              {TS_STRINGS.ctaDemo}
            </Link>
          </div>
          <p className="mt-4 text-xs text-ts-muted">
            데모: {TS_STRINGS.demoEmail} / {TS_STRINGS.demoPassword}
          </p>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold text-ts-ink">4가지 핵심 도구</h2>
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
