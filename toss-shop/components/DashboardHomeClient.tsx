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
import { TenMillionGoalCard, GoalMilestonesList } from "@/toss-shop/components/TenMillionGoalCard";
import type { TenMillionPlan } from "@/toss-shop/lib/types";

type BillingInfo = {
  access?: { label: string; fullAccess: boolean; tier: string };
  keywordUsage?: { used: number; limit: number } | null;
};

type RevenueBrief = {
  engineVersion?: string;
  portfolio?: {
    totalMonthlyProfitKrw: number;
    avgProfitScore: number;
    topKeyword: string;
  };
  tenMillionPlan?: TenMillionPlan;
  topPicks?: { keyword: string; monthlyProfitKrw: number; mode: string; geniusScore?: number }[];
};

export function DashboardHomeClient() {
  const [userName, setUserName] = useState("");
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [revenueBrief, setRevenueBrief] = useState<RevenueBrief | null>(null);

  const fetchData = useCallback(async () => {
    const [meRes, briefRes] = await Promise.all([
      fetch("/api/toss-shop/auth/me"),
      fetch("/api/toss-shop/revenue-brief").catch(() => null),
    ]);
    const d = (await meRes.json()) as {
      user?: { name: string };
      billing?: BillingInfo;
      api?: { configured?: boolean };
    };
    setUserName(d.user?.name ?? "");
    setBilling(d.billing ?? null);
    setApiConfigured(Boolean(d.api?.configured));

    if (briefRes?.ok) {
      setRevenueBrief((await briefRes.json()) as RevenueBrief);
    }
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  const heroCards = [
    { href: SP_ROUTES.consignment, title: "위탁판매 AI v6", desc: "월 1천만 · 대표아이템·도매꾹 소싱", accent: true },
    { href: SP_ROUTES.importSales, title: "수입판매 AI v6", desc: "월 1천만 · 카탈로그·1688·일본 소싱", accent: true },
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

      {!initialLoading && revenueBrief?.tenMillionPlan && (
        <div className="mt-5 space-y-4">
          <TenMillionGoalCard plan={revenueBrief.tenMillionPlan} />
          <GoalMilestonesList milestones={revenueBrief.tenMillionPlan.milestones} />
        </div>
      )}

      {!initialLoading && !revenueBrief?.tenMillionPlan && revenueBrief?.portfolio && revenueBrief.portfolio.totalMonthlyProfitKrw > 0 && (
        <div className="mt-5 rounded-2xl bg-gradient-to-br from-ts-primary/10 to-emerald-50 px-4 py-4 ring-1 ring-ts-primary/20">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-ts-ink">오늘의 AI v6 수익 브리핑</p>
            {revenueBrief.engineVersion && (
              <span className="rounded-full bg-ts-primary px-2 py-0.5 text-xs font-bold text-white">
                {revenueBrief.engineVersion.toUpperCase()}
              </span>
            )}
          </div>
          <p className="mt-2 text-2xl font-bold text-ts-primary">
            월 예상 합계 {formatKrw(revenueBrief.portfolio.totalMonthlyProfitKrw)}
          </p>
          <p className="mt-1 text-sm text-ts-muted">
            위탁+수입 10선 · 평균 수익점수 {revenueBrief.portfolio.avgProfitScore} · 1위 키워드 「
            {revenueBrief.portfolio.topKeyword}」
          </p>
        </div>
      )}

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
