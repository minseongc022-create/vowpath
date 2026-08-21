"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CompetitionBadge } from "@/toss-shop/components/ui/MetricBadges";
import { Sparkline } from "@/toss-shop/components/ui/Sparkline";
import { KeywordSearchBar } from "@/toss-shop/components/ui/KeywordSearchBar";
import { formatCompact, formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { KeywordAnalysis, TrackedKeyword } from "@/toss-shop/lib/types";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { UsageBadge } from "@/toss-shop/components/UpgradeBanner";
import { FREE_DAILY_KEYWORD_LIMIT } from "@/toss-shop/lib/billing";

type Tab = "overview" | "products" | "related";

export function KeywordsPanel() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState(initialQ);
  const [selected, setSelected] = useState<string | null>(initialQ || null);
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [analyzing, setAnalyzing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [limitError, setLimitError] = useState("");

  const fetchList = useCallback(async () => {
    const res = await fetch("/api/toss-shop/keywords");
    const data = (await res.json()) as {
      keywords: TrackedKeyword[];
      usage?: { used: number; limit: number } | null;
    };
    setKeywords(data.keywords ?? []);
    setUsage(data.usage ?? null);
  }, []);

  const { initialLoading } = useSilentFetch(fetchList);

  const analyze = useCallback(async (keyword: string) => {
    setSelected(keyword);
    setAnalyzing(true);
    setLimitError("");
    try {
      const res = await fetch(
        `/api/toss-shop/keywords?keyword=${encodeURIComponent(keyword)}&analyze=1`,
      );
      const data = (await res.json()) as {
        analysis?: KeywordAnalysis;
        error?: string;
        usage?: { used: number; limit: number };
      };
      if (!res.ok) {
        setLimitError(data.error ?? "분석할 수 없습니다.");
        if (data.usage) setUsage(data.usage);
        return;
      }
      if (data.analysis) {
        setAnalysis(data.analysis);
        setTab("overview");
      }
      if (data.usage) setUsage(data.usage);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (initialQ) void analyze(initialQ);
  }, [initialQ, analyze]);

  async function addKeyword(kw?: string) {
    const word = (kw ?? newKeyword).trim();
    if (!word || busy) return;
    setBusy(true);
    setLimitError("");
    try {
      const res = await fetch("/api/toss-shop/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: word }),
      });
      const data = (await res.json()) as { error?: string; usage?: { used: number; limit: number } };
      if (!res.ok) {
        setLimitError(data.error ?? "추가할 수 없습니다.");
        if (data.usage) setUsage(data.usage);
        return;
      }
      setNewKeyword("");
      if (data.usage) setUsage(data.usage);
      await fetchList();
      await analyze(word);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/toss-shop/keywords?id=${id}`, { method: "DELETE" });
      if (selected) {
        setSelected(null);
        setAnalysis(null);
      }
      await fetchList();
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "키워드 개요" },
    { id: "products", label: "상품 목록" },
    { id: "related", label: "연관 키워드" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <KeywordSearchBar defaultValue={initialQ} />
        {usage && <UsageBadge used={usage.used} limit={usage.limit ?? FREE_DAILY_KEYWORD_LIMIT} />}
      </div>

      {limitError && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {limitError}{" "}
          <a href={`${SP_ROUTES.settings}#upgrade`} className="font-semibold underline">
            Pro 업그레이드
          </a>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="ts-input min-w-0 flex-1"
          placeholder="키워드 입력 (예: 방울토마토)"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addKeyword()}
        />
        <button type="button" onClick={() => void addKeyword()} disabled={busy} className="ts-btn-primary shrink-0 sm:!w-auto sm:px-6">
          추적 추가
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[240px_1fr]">
        <aside className="ts-card-compact xl:sticky xl:top-20 xl:self-start">
          <h2 className="ts-section-title">추적 키워드</h2>
          {initialLoading ? (
            <div className="mt-3 space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="ts-skeleton h-10 w-full" />)}
            </div>
          ) : keywords.length === 0 ? (
            <p className="mt-2 text-sm text-ts-muted">키워드를 추가하거나 검색하세요.</p>
          ) : (
            <ul className="mt-2 space-y-0.5">
              {keywords.map((k) => (
                <li key={k.id} className={selected === k.keyword ? "ts-keyword-item ts-keyword-item-active" : "ts-keyword-item"}>
                  <button type="button" onClick={() => void analyze(k.keyword)} className="min-w-0 flex-1 truncate text-left">
                    {k.keyword}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(k.id)}
                    className="shrink-0 text-[10px] text-ts-muted hover:text-red-500"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="ts-card min-h-[420px]">
          {analyzing ? (
            <div className="space-y-4">
              <div className="ts-skeleton h-8 w-48" />
              <div className="ts-metric-grid">
                {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="ts-skeleton h-20" />)}
              </div>
            </div>
          ) : !analysis ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <p className="text-lg font-bold text-ts-ink">키워드 분석</p>
              <p className="mt-2 max-w-sm text-sm text-ts-muted">
                검색창에 키워드를 입력하거나 왼쪽 목록에서 선택하세요. 검색량, 경쟁강도, 상위 상품, 연관 키워드를 확인할 수 있습니다.
              </p>
              <Link href={SP_ROUTES.discovery} className="ts-link-action mt-4">
                아이템 발굴에서 키워드 찾기 →
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ts-border pb-4">
                <div>
                  <h2 className="text-xl font-bold text-ts-ink">{analysis.keyword}</h2>
                  <p className="mt-1 text-sm text-ts-muted">
                    경쟁강도 <CompetitionBadge grade={analysis.competitionGrade} intensity={analysis.competitionIntensity} />
                  </p>
                </div>
                <button type="button" onClick={() => void addKeyword(analysis.keyword)} className="ts-btn-secondary !min-h-[40px] !w-auto px-4 text-sm">
                  추적 목록에 추가
                </button>
              </div>

              <div className="ts-tab-bar mt-4">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={tab === t.id ? "ts-tab ts-tab-active" : "ts-tab"}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "overview" && (
                <div className="mt-5 space-y-5">
                  <div className="ts-metric-grid">
                    <div className="ts-metric-cell">
                      <p className="ts-metric-label">상품수</p>
                      <p className="ts-metric-value">{analysis.competingProducts.toLocaleString()}<span className="ts-metric-unit">개</span></p>
                    </div>
                    <div className="ts-metric-cell">
                      <p className="ts-metric-label">한 달 검색수</p>
                      <p className="ts-metric-value">{formatCompact(analysis.searchVolume)}<span className="ts-metric-unit">회</span></p>
                    </div>
                    <div className="ts-metric-cell">
                      <p className="ts-metric-label">PC / 모바일</p>
                      <p className="ts-metric-value text-lg">{analysis.mobileRatio}%<span className="ts-metric-unit"> 모바일</span></p>
                      <p className="text-xs text-ts-muted">{formatCompact(analysis.pcSearchVolume)} / {formatCompact(analysis.mobileSearchVolume)}</p>
                    </div>
                    <div className="ts-metric-cell">
                      <p className="ts-metric-label">6개월 판매량</p>
                      <p className="ts-metric-value">{formatCompact(analysis.sixMonthSales)}<span className="ts-metric-unit">개</span></p>
                    </div>
                    <div className="ts-metric-cell">
                      <p className="ts-metric-label">6개월 매출</p>
                      <p className="ts-metric-value">{analysis.sixMonthRevenue}<span className="ts-metric-unit">만원</span></p>
                    </div>
                    <div className="ts-metric-cell">
                      <p className="ts-metric-label">평균 가격</p>
                      <p className="ts-metric-value text-lg">{formatKrw(analysis.avgPriceKrw)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-ts-bg p-4 ring-1 ring-ts-border">
                    <p className="text-xs font-semibold text-ts-muted">검색량 추세 (30일)</p>
                    <Sparkline data={analysis.trend} className="mt-2 h-16 w-full" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="ts-mini-stat">
                      <p className="text-xs text-ts-muted">실거래상품 비율</p>
                      <p className="mt-1 font-bold text-ts-ink">{analysis.realProductRatio}%</p>
                    </div>
                    <div className="ts-mini-stat">
                      <p className="text-xs text-ts-muted">해외상품 비율</p>
                      <p className="mt-1 font-bold text-ts-ink">{analysis.overseasProductRatio}%</p>
                    </div>
                    <div className="ts-mini-stat">
                      <p className="text-xs text-ts-muted">경쟁 종합</p>
                      <p className="mt-1"><CompetitionBadge grade={analysis.competitionGrade} /></p>
                    </div>
                  </div>
                </div>
              )}

              {tab === "products" && (
                <div className="mt-4 overflow-x-auto">
                  <table className="ts-data-table">
                    <thead>
                      <tr>
                        <th>순위</th>
                        <th>상품명</th>
                        <th>판매자</th>
                        <th>가격</th>
                        <th>리뷰</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.topProducts.map((p) => (
                        <tr key={p.id}>
                          <td className="font-bold text-ts-primary">{p.rank}</td>
                          <td className="max-w-[200px] truncate font-medium">{p.name}</td>
                          <td className="text-ts-muted">{p.sellerName}</td>
                          <td>{formatKrw(p.priceKrw)}</td>
                          <td>{p.reviewCount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === "related" && (
                <div className="mt-4 space-y-2">
                  {analysis.suggestions.map((s) => (
                    <button
                      key={s.keyword}
                      type="button"
                      onClick={() => void analyze(s.keyword)}
                      className="ts-related-keyword"
                    >
                      <span className="font-semibold">{s.keyword}</span>
                      <span className="text-xs text-ts-muted">검색 {formatCompact(s.searchVolume)}</span>
                      <CompetitionBadge grade={s.competitionIntensity < 1 ? "good" : "fair"} intensity={s.competitionIntensity} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
