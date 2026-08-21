"use client";

import { useCallback, useState } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { KeywordAnalysis, TrackedKeyword } from "@/toss-shop/lib/types";

export function KeywordsPanel() {
  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchList = useCallback(async () => {
    const res = await fetch("/api/toss-shop/keywords");
    const data = (await res.json()) as { keywords: TrackedKeyword[] };
    setKeywords(data.keywords ?? []);
  }, []);

  const { initialLoading } = useSilentFetch(fetchList);

  async function addKeyword() {
    if (!newKeyword.trim() || busy) return;
    setBusy(true);
    try {
      await fetch("/api/toss-shop/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: newKeyword.trim() }),
      });
      setNewKeyword("");
      await fetchList();
    } finally {
      setBusy(false);
    }
  }

  async function analyze(keyword: string) {
    setSelected(keyword);
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/toss-shop/keywords?keyword=${encodeURIComponent(keyword)}&analyze=1`);
      const data = (await res.json()) as { analysis: KeywordAnalysis };
      setAnalysis(data.analysis);
    } finally {
      setAnalyzing(false);
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

  const difficultyLabel = { easy: "쉬움", medium: "보통", hard: "어려움" };
  const difficultyColor = { easy: "text-emerald-600", medium: "text-amber-600", hard: "text-red-600" };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="ts-input min-w-0 flex-1"
          placeholder="키워드 입력 (예: 방울토마토)"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addKeyword()}
        />
        <button type="button" onClick={addKeyword} disabled={busy} className="ts-btn-primary shrink-0">
          추적 추가
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="ts-card min-h-[280px]">
          <h2 className="text-sm font-bold">추적 키워드</h2>
          {initialLoading ? (
            <div className="mt-4 space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="ts-skeleton h-10 w-full" />)}
            </div>
          ) : keywords.length === 0 ? (
            <p className="mt-3 text-sm text-ts-muted">키워드를 추가해 분석을 시작하세요.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {keywords.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-2 rounded-xl bg-ts-bg px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => analyze(k.keyword)}
                    className={`min-w-0 truncate text-left text-sm font-semibold ${selected === k.keyword ? "text-ts-primary" : "hover:text-ts-primary"}`}
                  >
                    {k.keyword}
                  </button>
                  <button type="button" onClick={() => remove(k.id)} className="shrink-0 text-xs text-red-500">
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ts-card min-h-[280px]">
          <h2 className="text-sm font-bold">키워드 분석</h2>
          {analyzing ? (
            <div className="mt-4 space-y-3">
              <div className="ts-skeleton h-6 w-32" />
              <div className="ts-stat-grid">
                {[1, 2, 3].map((i) => <div key={i} className="ts-skeleton h-16" />)}
              </div>
            </div>
          ) : !analysis ? (
            <p className="mt-3 text-sm text-ts-muted">키워드를 선택하면 분석 결과가 표시됩니다.</p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-lg font-bold">{analysis.keyword}</p>
                <p className={`text-sm font-semibold ${difficultyColor[analysis.difficulty]}`}>
                  난이도: {difficultyLabel[analysis.difficulty]}
                </p>
              </div>
              <div className="ts-stat-grid">
                <div className="ts-stat">
                  <p className="text-[10px] font-bold text-ts-muted">월 검색량</p>
                  <p className="text-lg font-bold">{analysis.searchVolume.toLocaleString()}</p>
                </div>
                <div className="ts-stat">
                  <p className="text-[10px] font-bold text-ts-muted">경쟁 상품</p>
                  <p className="text-lg font-bold">{analysis.competingProducts}</p>
                </div>
                <div className="ts-stat">
                  <p className="text-[10px] font-bold text-ts-muted">평균 가격</p>
                  <p className="text-lg font-bold">{formatKrw(analysis.avgPriceKrw)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-ts-muted">상위 노출 상품</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {analysis.topProducts.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">{p.rank}. {p.name}</span>
                      <span className="shrink-0 text-ts-muted">{formatKrw(p.priceKrw)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold text-ts-muted">연관 키워드</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {analysis.suggestions.map((s) => (
                    <span key={s} className="ts-badge-neutral">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
