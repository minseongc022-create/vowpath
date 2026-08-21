"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import { TS_STRINGS } from "@/toss-shop/lib/strings";

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

  useEffect(() => {
    void fetch("/api/toss-shop/auth/me")
      .then((r) => r.json())
      .then((d: { user?: { name: string }; stats?: Stats; api?: ApiInfo }) => {
        setUserName(d.user?.name ?? "");
        setStats(d.stats ?? null);
        setApi(d.api ?? null);
      });
  }, []);

  const cards = [
    { href: "/toss-shop/dashboard/rankings", title: "랭킹·가격 추적", desc: "베스트셀러 순위와 가격 변동", stat: stats?.watchlistCount, unit: "추적 중" },
    { href: "/toss-shop/dashboard/keywords", title: "키워드 분석", desc: "검색량·경쟁도·상위 노출", stat: stats?.keywordCount, unit: "키워드" },
    { href: "/toss-shop/dashboard/competitors", title: "경쟁사 모니터링", desc: "가격·랭킹 변동 알림", stat: stats?.unreadAlerts, unit: "새 알림" },
    { href: "/toss-shop/dashboard/settlements", title: "정산 대조", desc: "예상 vs 실제 입금 확인", stat: stats?.pendingPayoutKrw, unit: "대기 정산", format: true },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ts-ink">
        {userName ? `${userName}님, ` : ""}대시보드
      </h1>
      <p className="mt-1 text-sm text-ts-muted">
        토스쇼핑 셀러 운영 데이터를 한눈에 확인하세요.
        {api && (
          <span className="ml-2 rounded-full bg-ts-bg px-2 py-0.5 text-xs font-semibold text-ts-muted">
            {api.dataSource === "live" ? "실시간 API" : api.configured ? "API 연동" : "데모 모드"}
          </span>
        )}
      </p>

      {stats && stats.discrepancyCount > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          정산 불일치 {stats.discrepancyCount}건 —{" "}
          <Link href="/toss-shop/dashboard/settlements" className="font-semibold underline">
            정산 페이지에서 확인
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="ts-card transition hover:shadow-md">
            <h2 className="font-bold text-ts-ink">{c.title}</h2>
            <p className="mt-1 text-sm text-ts-muted">{c.desc}</p>
            {stats && c.stat != null && (
              <p className="mt-3 text-2xl font-extrabold text-ts-primary">
                {c.format ? formatKrw(c.stat) : c.stat}
                <span className="ml-1 text-xs font-normal text-ts-muted">{c.unit}</span>
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
