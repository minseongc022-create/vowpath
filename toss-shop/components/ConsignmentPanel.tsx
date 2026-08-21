"use client";

import { useCallback, useState } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { ConsignmentPick } from "@/toss-shop/lib/types";
import { UpgradeBanner } from "@/toss-shop/components/UpgradeBanner";
import { SourcingAnalysisCard } from "@/toss-shop/components/SourcingAnalysisCard";

type Meta = {
  dataQuality?: string;
  catalogSize?: number;
  marketKeywordCount?: number;
};

export function ConsignmentPanel() {
  const [picks, setPicks] = useState<ConsignmentPick[]>([]);
  const [meta, setMeta] = useState<Meta>({});
  const [blocked, setBlocked] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/toss-shop/consignment");
    if (res.status === 402) {
      setBlocked(true);
      return;
    }
    const data = (await res.json()) as {
      picks: ConsignmentPick[];
      dataQuality?: string;
      catalogSize?: number;
      marketKeywordCount?: number;
    };
    setPicks(data.picks ?? []);
    setMeta({
      dataQuality: data.dataQuality,
      catalogSize: data.catalogSize,
      marketKeywordCount: data.marketKeywordCount,
    });
    setBlocked(false);
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  if (blocked) return <UpgradeBanner feature="위탁판매 AI 추천" />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-ts-primary/10 px-4 py-3 text-sm text-ts-ink ring-1 ring-ts-primary/20">
        <p className="font-bold">AI 위탁 소싱 · 오늘 5선</p>
        <p className="mt-1 text-ts-muted">
          키워드·경쟁사·마진·가격을 다층 분석 → 등록 상품명·판매가·실행 체크리스트까지 제안
        </p>
        {meta.catalogSize != null && (
          <p className="mt-2 text-xs text-ts-muted">
            분석 데이터: {meta.catalogSize}개 상품 · 키워드 {meta.marketKeywordCount ?? 0}개 ·{" "}
            {meta.dataQuality === "live" ? "실데이터" : meta.dataQuality === "mixed" ? "혼합" : "데모"}
          </p>
        )}
      </div>

      {initialLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="ts-skeleton h-40 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {picks.map((p, i) => (
            <article key={p.id} className="ts-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-ts-primary">#{i + 1} · {p.keyword}</p>
                  <h3 className="mt-1 font-bold text-ts-ink">{p.productName}</h3>
                </div>
                <span className="ts-grade-badge ts-grade-good">{p.winScore ?? p.confidenceScore}점</span>
              </div>

              <div className="ts-metric-grid mt-4">
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">AI 추천 판매가</p>
                  <p className="ts-metric-value text-lg">{formatKrw(p.recommendedPriceKrw)}</p>
                </div>
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">공급가</p>
                  <p className="ts-metric-value text-lg">{formatKrw(p.supplierCostKrw)}</p>
                </div>
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">순마진</p>
                  <p className="ts-metric-value text-lg">{p.estimatedMarginPct}%</p>
                </div>
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">일 예상 수익</p>
                  <p className="ts-metric-value text-lg text-ts-primary">
                    {formatKrw(p.estimatedDailyProfitKrw)}
                    {p.estimatedDailyUnits != null && (
                      <span className="ts-metric-unit"> · {p.estimatedDailyUnits}개</span>
                    )}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-ts-muted">{p.reason}</p>

              <SourcingAnalysisCard
                winScore={p.winScore}
                suggestedTitle={p.suggestedTitle}
                pricing={p.pricing}
                signals={p.signals}
                actionSteps={p.actionSteps}
                risks={p.risks}
                competitors={p.competitorInsights}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
