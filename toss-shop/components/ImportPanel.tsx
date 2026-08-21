"use client";

import { useCallback, useState } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { ImportPick } from "@/toss-shop/lib/types";
import { UpgradeBanner } from "@/toss-shop/components/UpgradeBanner";

export function ImportPanel() {
  const [picks, setPicks] = useState<ImportPick[]>([]);
  const [blocked, setBlocked] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/toss-shop/import-sales");
    if (res.status === 402) {
      setBlocked(true);
      return;
    }
    const data = (await res.json()) as { picks: ImportPick[] };
    setPicks(data.picks ?? []);
    setBlocked(false);
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  if (blocked) return <UpgradeBanner feature="수입판매 AI 추천" />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
        <p className="font-bold">오늘의 수입판매 추천</p>
        <p className="mt-1 text-emerald-800/80">
          해외 소싱가 · 관세·배송 랜딩비 · 국내 시장가 대비 수익 분석
        </p>
      </div>

      {initialLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="ts-skeleton h-32 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {picks.map((p, i) => (
            <article key={p.id} className="ts-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-ts-primary">#{i + 1} · {p.sourceCountry} · {p.keyword}</p>
                  <h3 className="mt-1 font-bold text-ts-ink">{p.productName}</h3>
                </div>
                <span className="ts-grade-badge ts-grade-excellent">{p.confidenceScore}점</span>
              </div>

              <div className="ts-metric-grid mt-4">
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">소싱가</p>
                  <p className="ts-metric-value text-base">${p.sourcePriceUsd}</p>
                </div>
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">랜딩비</p>
                  <p className="ts-metric-value text-base">{formatKrw(p.landedCostKrw)}</p>
                </div>
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">추천 판매가</p>
                  <p className="ts-metric-value text-base">{formatKrw(p.recommendedPriceKrw)}</p>
                </div>
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">월 예상 수익</p>
                  <p className="ts-metric-value text-base text-ts-primary">{formatKrw(p.estimatedMonthlyProfitKrw)}</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-ts-muted">
                국내 평균 {formatKrw(p.marketAvgPriceKrw)} · 마진 {p.estimatedMarginPct}% · 월 {p.estimatedMonthlyUnits}개 예상
              </p>
              <p className="mt-1 text-xs text-ts-muted">{p.reason}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
