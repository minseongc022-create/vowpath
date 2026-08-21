"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  IconCompetitors,
  IconDiscovery,
  IconKeywords,
  IconRankings,
  IconSettlements,
} from "@/toss-shop/components/icons/FeatureIcons";
import { KeywordSearchBar } from "@/toss-shop/components/ui/KeywordSearchBar";
import { UsageBadge } from "@/toss-shop/components/UpgradeBanner";
import { formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";

type BillingInfo = {
  access?: { label: string; fullAccess: boolean; tier: string };
  keywordUsage?: { used: number; limit: number } | null;
};

export function DashboardHomeClient() {
  const [userName, setUserName] = useState("");
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [apiConfigured, setApiConfigured] = useState(false);

  const fetchData = useCallback(async () => {
    const r = await fetch("/api/toss-shop/auth/me");
    const d = (await r.json()) as {
      user?: { name: string };
      billing?: BillingInfo;
      api?: { configured?: boolean };
    };
    setUserName(d.user?.name ?? "");
    setBilling(d.billing ?? null);
    setApiConfigured(Boolean(d.api?.configured));
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  const heroCards = [
    { href: SP_ROUTES.consignment, title: "위탁판매 AI", desc: "AI 다층 분석 · 가격·소싱·체크리스트", accent: true },
    { href: SP_ROUTES.importSales, title: "수입판매 AI", desc: "관세·랜딩·경쟁가·마진 자동 계산", accent: true },
  ];

  const toolCards = [
    { href: SP_ROUTES.keywords, title: "키워드 분석", desc: "검색량·차트·연관 키워드", Icon: IconKeywords },
    { href: SP_ROUTES.discovery, title: "아이템 발굴", desc: "수요·공급 키워드", Icon: IconDiscovery },
    { href: SP_ROUTES.rankings, title: "랭킹 추적", desc: "키워드별 노출 순위", Icon: IconRankings },
    { href: SP_ROUTES.settlements, title: "정산", desc: "토스 API 정산 대조", Icon: IconSettlements },
    { href: SP_ROUTES.competitors, title: "경쟁사", desc: "가격·랭킹 알림", Icon: IconCompetitors },
  ];

  return (
    <div className="sp-dashboard mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="ts-page-title">{userName ? `${userName}님` : "대시보드"}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ts-muted">
            {SP_STRINGS.brand}
            {!initialLoading && billing?.access && (
              <span className="ts-badge-neutral">{billing.access.label}</span>
            )}
            {!initialLoading && billing?.keywordUsage && (
              <UsageBadge used={billing.keywordUsage.used} limit={billing.keywordUsage.limit} />
            )}
          </p>
        </div>
        {!apiConfigured && (
          <Link href={SP_ROUTES.settings} className="ts-btn-inline ts-btn-secondary">
            API 연동
          </Link>
        )}
      </div>

      {!initialLoading && billing?.access && !billing.access.fullAccess && (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-100">
          Free 플랜: 하루 3회 키워드 분석 · 위탁/수입 AI는 Pro 필요 (
          <Link href={`${SP_ROUTES.settings}#upgrade`} className="font-semibold underline">
            월 1만원 업그레이드
          </Link>
          )
        </div>
      )}

      <div className="mt-5">
        <KeywordSearchBar />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {heroCards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl bg-ts-primary px-4 py-5 text-white shadow-sm transition-opacity active:opacity-90"
          >
            <p className="text-lg font-bold">{c.title}</p>
            <p className="mt-1 text-sm text-white/85">{c.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {toolCards.map((c) => (
          <Link key={c.href} href={c.href} className="ts-list-row block">
            <div className="ts-icon-box">
              <c.Icon />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ts-ink">{c.title}</p>
              <p className="text-sm text-ts-muted">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
