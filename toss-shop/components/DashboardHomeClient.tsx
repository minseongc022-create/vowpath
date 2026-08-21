"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  IconCompetitors,
  IconKeywords,
  IconRankings,
  IconSettlements,
} from "@/toss-shop/components/icons/FeatureIcons";
import { formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { SP_STRINGS } from "@/toss-shop/lib/strings";

type Stats = {
  watchlistCount: number;
  keywordCount: number;
  competitorCount: number;
  unreadAlerts: number;
  pendingPayoutKrw: number;
  discrepancyCount: number;
};

type ApiInfo = {
  dataSource?: string;
  lastSyncAt?: string;
  configured?: boolean;
};

export function DashboardHomeClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [userName, setUserName] = useState("");
  const [api, setApi] = useState<ApiInfo | null>(null);

  const fetchData = useCallback(async () => {
    const r = await fetch("/api/toss-shop/auth/me");
    const d = (await r.json()) as { user?: { name: string }; stats?: Stats; api?: ApiInfo };
    setUserName(d.user?.name ?? "");
    setStats(d.stats ?? null);
    setApi(d.api ?? null);
  }, []);

  const { initialLoading, refreshing } = useSilentFetch(fetchData);

  const cards = [
    { href: SP_ROUTES.rankings, title: "랭킹·가격", desc: "순위와 가격 변동", stat: stats?.watchlistCount, unit: "추적", Icon: IconRankings },
    { href: SP_ROUTES.keywords, title: "키워드", desc: "검색·경쟁 분석", stat: stats?.keywordCount, unit: "키워드", Icon: IconKeywords },
    { href: SP_ROUTES.competitors, title: "경쟁사", desc: "가격·랭킹 알림", stat: stats?.unreadAlerts, unit: "새 알림", Icon: IconCompetitors },
    { href: SP_ROUTES.settlements, title: "정산", desc: "예상 vs 실제 입금", stat: stats?.pendingPayoutKrw, unit: "대기", format: true, Icon: IconSettlements },
  ];

  const modeLabel = api?.dataSource === "live" ? "API 연동" : api?.configured ? "연동됨" : "데모";

  return (
    <div className="sp-dashboard mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="ts-page-title">{userName ? `${userName}님` : "대시보드"}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ts-muted">
            {SP_STRINGS.brand}
            <span className="ts-badge-neutral">{modeLabel}</span>
            {refreshing && (
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="ts-refresh-dot ts-refresh-dot-pulse" aria-hidden />
                갱신 중
              </span>
            )}
          </p>
        </div>
        {!api?.configured && (
          <Link href={SP_ROUTES.settings} className="ts-btn-inline ts-btn-secondary">
            API 연동
          </Link>
        )}
      </div>

      {stats && stats.discrepancyCount > 0 && (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          정산 불일치 {stats.discrepancyCount}건 —{" "}
          <Link href={SP_ROUTES.settlements} className="font-semibold underline">
            확인하기
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="ts-list-row block">
            <div className="ts-icon-box">
              <c.Icon />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ts-ink">{c.title}</p>
              <p className="text-sm text-ts-muted">{c.desc}</p>
            </div>
            <div className="shrink-0 text-right">
              {!initialLoading && stats && c.stat != null && (
                <p className="text-lg font-bold text-ts-primary">
                  {c.format ? formatKrw(c.stat) : c.stat}
                  <span className="ml-1 text-xs font-normal text-ts-muted">{c.unit}</span>
                </p>
              )}
              {initialLoading && <div className="ts-skeleton h-7 w-16" />}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
