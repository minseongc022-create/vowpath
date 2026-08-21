import Link from "next/link";
import { LegalDisclaimer } from "@/toss-shop/components/LegalDisclaimer";
import {
  IconCompetitors,
  IconKeywords,
  IconRankings,
  IconSettlements,
} from "@/toss-shop/components/icons/FeatureIcons";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";

const FEATURES = [
  {
    Icon: IconRankings,
    title: "랭킹·가격 추적",
    desc: "카테고리별 순위와 가격 변동을 확인하고 관심 상품을 추적합니다.",
  },
  {
    Icon: IconKeywords,
    title: "키워드 분석",
    desc: "검색량·경쟁 상품·상위 노출 상품을 분석합니다.",
  },
  {
    Icon: IconCompetitors,
    title: "경쟁사 모니터링",
    desc: "경쟁 셀러의 가격·랭킹 변동을 추적합니다.",
  },
  {
    Icon: IconSettlements,
    title: "정산 대조",
    desc: "예상 정산금과 실제 입금액을 대조합니다.",
  },
];

const STEPS = [
  { step: "1", title: "API 키 연동", desc: "셀러센터에서 발급한 키 입력" },
  { step: "2", title: "데이터 수집", desc: "상품·정산·키워드 자동 반영" },
  { step: "3", title: "판매 전략", desc: "랭킹·가격·경쟁사 인사이트 활용" },
];

export default function EffiroadHomePage() {
  return (
    <>
      <section className="bg-ts-surface">
        <div className="ts-section py-12 sm:py-16">
          <p className="text-sm font-semibold text-ts-primary">
            {SP_STRINGS.brand} · {SP_STRINGS.brandEn}
          </p>
          <h1 className="mt-3 max-w-2xl text-[28px] font-bold leading-tight tracking-tight text-ts-ink sm:text-[40px]">
            {SP_STRINGS.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ts-muted">
            {SP_STRINGS.heroSubtitle}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={SP_ROUTES.login} className="ts-btn-primary sm:!w-auto sm:px-8">
              {SP_STRINGS.ctaStart}
            </Link>
            <Link href={SP_ROUTES.login} className="ts-btn-secondary sm:!w-auto sm:px-8">
              {SP_STRINGS.ctaDemo}
            </Link>
          </div>
          <div className="mt-6 max-w-xl">
            <LegalDisclaimer compact />
          </div>
        </div>
      </section>

      <section id="features" className="ts-section py-12 sm:py-14">
        <h2 className="text-xl font-bold text-ts-ink">주요 기능</h2>
        <p className="mt-2 text-sm text-ts-muted">토스쇼핑 셀러에게 필요한 분석 도구를 모았습니다.</p>
        <div className="ts-feature-grid mt-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="ts-feature-item">
              <div className="flex w-full items-center gap-4">
                <div className="ts-icon-box">
                  <f.Icon />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-ts-ink">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ts-muted">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ts-surface py-12 sm:py-14">
        <div className="ts-section">
          <h2 className="text-xl font-bold text-ts-ink">시작 방법</h2>
          <ol className="mt-6 space-y-3">
            {STEPS.map((s) => (
              <li key={s.step} className="ts-list-row">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ts-primary-soft text-sm font-bold text-ts-primary">
                  {s.step}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-ts-ink">{s.title}</p>
                  <p className="mt-0.5 text-sm text-ts-muted">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ts-section py-12 text-center sm:py-14">
        <h2 className="text-xl font-bold text-ts-ink">지금 시작하기</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ts-muted">
          API 키로 연동하거나 데모 계정으로 기능을 체험할 수 있습니다.
        </p>
        <Link href={SP_ROUTES.login} className="ts-btn-primary mx-auto mt-6 sm:!w-auto sm:px-8">
          {SP_STRINGS.ctaApiConnect}
        </Link>
      </section>
    </>
  );
}
