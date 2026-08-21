"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { TrendBadge, CompetitionBadge } from "@/toss-shop/components/ui/MetricBadges";
import { KeywordSearchBar } from "@/toss-shop/components/ui/KeywordSearchBar";
import { formatCompact, formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { DiscoveryKeyword } from "@/toss-shop/lib/discovery";
import { SP_ROUTES } from "@/toss-shop/lib/routes";

type DiscoveryData = {
  keywords: DiscoveryKeyword[];
  categories: Array<{ id: string; label: string }>;
  trendingKeywords: Array<{ rank: number; keyword: string; searchVolume: number; trendPct: number }>;
  trendingProducts: Array<{ rank: number; id: string; name: string; priceKrw: number; reviewCount: number; sellerName: string }>;
};

export function DiscoveryPanel() {
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"search" | "competition" | "trend">("search");
  const [data, setData] = useState<DiscoveryData | null>(null);

  const fetchData = useCallback(async () => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    qs.set("sort", sort);
    const res = await fetch(`/api/toss-shop/discovery?${qs}`);
    setData((await res.json()) as DiscoveryData);
  }, [category, sort]);

  const { initialLoading } = useSilentFetch(fetchData);

  return (
    <div className="space-y-5">
      <KeywordSearchBar />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ts-card-compact">
          <h2 className="ts-section-title">키워드 Best</h2>
          <p className="ts-section-desc">토스쇼핑에서 검색량이 높은 키워드</p>
          <ol className="mt-3 space-y-1">
            {(data?.trendingKeywords ?? []).slice(0, 5).map((k) => (
              <li key={k.keyword}>
                <Link
                  href={`${SP_ROUTES.keywords}?q=${encodeURIComponent(k.keyword)}`}
                  className="ts-rank-list-item"
                >
                  <span className="ts-rank-num">{k.rank}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{k.keyword}</span>
                  <span className="text-xs text-ts-muted">{formatCompact(k.searchVolume)}</span>
                  <TrendBadge pct={k.trendPct} />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="ts-card-compact">
          <h2 className="ts-section-title">판매량 Best</h2>
          <p className="ts-section-desc">토스쇼핑 인기 상품</p>
          <ol className="mt-3 space-y-1">
            {(data?.trendingProducts ?? []).slice(0, 5).map((p) => (
              <li key={p.id} className="ts-rank-list-item">
                <span className="ts-rank-num">{p.rank}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                <span className="text-xs font-semibold">{formatKrw(p.priceKrw)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="ts-filter-bar">
        <div className="ts-category-scroll">
          {(data?.categories ?? [{ id: "", label: "전체" }]).map((c) => (
            <button
              key={c.id || "all"}
              type="button"
              onClick={() => setCategory(c.id)}
              className={category === c.id ? "ts-chip ts-chip-active" : "ts-chip"}
            >
              {c.label}
            </button>
          ))}
        </div>
        <select
          className="ts-select-compact"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          <option value="search">검색량순</option>
          <option value="competition">경쟁강도순</option>
          <option value="trend">급상승순</option>
        </select>
      </div>

      <section className="ts-card overflow-hidden !p-0">
        <div className="border-b border-ts-border px-4 py-3">
          <h2 className="ts-section-title">아이템 발굴</h2>
          <p className="ts-section-desc">카테고리별 키워드 수요·공급 — 검색수, 상품수, 경쟁강도</p>
        </div>

        {initialLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="ts-skeleton h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="ts-data-table">
                <thead>
                  <tr>
                    <th>키워드</th>
                    <th>총 검색수</th>
                    <th>PC / 모바일</th>
                    <th>상품수</th>
                    <th>경쟁강도</th>
                    <th>평균가</th>
                    <th>추세</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(data?.keywords ?? []).map((k) => (
                    <tr key={k.keyword}>
                      <td className="font-semibold">{k.keyword}</td>
                      <td>{k.searchVolume.toLocaleString()}</td>
                      <td className="text-ts-muted">
                        {formatCompact(k.pcSearchVolume)} / {formatCompact(k.mobileSearchVolume)}
                      </td>
                      <td>{k.productCount.toLocaleString()}</td>
                      <td>
                        <CompetitionBadge grade={k.competitionGrade} intensity={k.competitionIntensity} />
                      </td>
                      <td>{formatKrw(k.avgPriceKrw)}</td>
                      <td><TrendBadge pct={k.trendPct} /></td>
                      <td>
                        <Link
                          href={`${SP_ROUTES.keywords}?q=${encodeURIComponent(k.keyword)}`}
                          className="ts-link-action"
                        >
                          분석
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-ts-border md:hidden">
              {(data?.keywords ?? []).map((k) => (
                <Link
                  key={k.keyword}
                  href={`${SP_ROUTES.keywords}?q=${encodeURIComponent(k.keyword)}`}
                  className="block px-4 py-3 active:bg-ts-bg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-ts-ink">{k.keyword}</p>
                    <TrendBadge pct={k.trendPct} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ts-muted">
                    <span>검색 {formatCompact(k.searchVolume)}</span>
                    <span>상품 {k.productCount.toLocaleString()}</span>
                    <CompetitionBadge grade={k.competitionGrade} intensity={k.competitionIntensity} />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
