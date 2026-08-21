"use client";

import { useCallback, useState } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { ImportPick } from "@/toss-shop/lib/types";
import { UpgradeBanner } from "@/toss-shop/components/UpgradeBanner";
import { SourcingAnalysisCard } from "@/toss-shop/components/SourcingAnalysisCard";

type Meta = {
  dataQuality?: string;
  catalogSize?: number;
  engineVersion?: string;
};

export function ImportPanel() {
  const [picks, setPicks] = useState<ImportPick[]>([]);
  const [meta, setMeta] = useState<Meta>({});
  const [blocked, setBlocked] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/toss-shop/import-sales");
    if (res.status === 402) {
      setBlocked(true);
      return;
    }
    const data = (await res.json()) as {
      picks: ImportPick[];
      dataQuality?: string;
      catalogSize?: number;
      engineVersion?: string;
    };
    setPicks(data.picks ?? []);
    setMeta({ dataQuality: data.dataQuality, catalogSize: data.catalogSize, engineVersion: data.engineVersion });
    setBlocked(false);
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  if (blocked) return <UpgradeBanner feature="수입판매 AI 추천" />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold">AI 수입 소싱 · 오늘 5선</p>
          {meta.engineVersion && (
            <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-bold text-white">
              {meta.engineVersion.toUpperCase()}
            </span>
          )}
        </div>
        <p className="mt-1 text-emerald-800/80">
          중국 1688·일본 라쿠텐 소싱 링크 · 랜딩·마진 · AI가 수입 경로 추천
        </p>
        {meta.catalogSize != null && (
          <p className="mt-2 text-xs text-emerald-800/70">
            {meta.catalogSize}개 시장 상품 기준 · {meta.dataQuality === "live" ? "실데이터" : "학습 데이터"}
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
                  <p className="text-xs font-bold text-ts-primary">
                    #{i + 1} · {p.sourceCountry} · {p.keyword}
                  </p>
                  <h3 className="mt-1 font-bold text-ts-ink">{p.productName}</h3>
                </div>
                <span className="ts-grade-badge ts-grade-excellent">
                  {p.geniusScore ?? p.profitScore ?? p.winScore ?? p.confidenceScore} genius
                </span>
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
                  <p className="ts-metric-label">AI 판매가</p>
                  <p className="ts-metric-value text-base">{formatKrw(p.recommendedPriceKrw)}</p>
                </div>
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">월 예상 수익</p>
                  <p className="ts-metric-value text-base text-ts-primary">{formatKrw(p.estimatedMonthlyProfitKrw)}</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-ts-muted">
                국내 평균 {formatKrw(p.marketAvgPriceKrw)} · 마진 {p.estimatedMarginPct}% · 월{" "}
                {p.estimatedMonthlyUnits}개
              </p>
              <p className="mt-1 text-xs text-ts-muted">{p.reason}</p>

              <SourcingAnalysisCard
                winScore={p.winScore}
                profitScore={p.profitScore}
                suggestedTitle={p.suggestedTitle}
                pricing={p.pricing}
                signals={p.signals}
                actionSteps={p.actionSteps}
                risks={p.risks}
                competitors={p.competitorInsights}
                aiSummary={p.aiSummary}
                competitorLandscape={p.competitorLandscape}
                pricingScenarios={p.pricingScenarios}
                revenueForecast={p.revenueForecast}
                profitPlaybook={p.profitPlaybook}
                keywordCluster={p.v4?.keywordCluster}
                moatOpportunities={p.v4?.moatOpportunities}
                importSources={p.importSources}
                importBest={p.importBest}
                sourcingBrief={p.sourcingBrief}
                geniusScore={p.geniusScore}
                goalSharePct={p.goalSharePct}
                goalPathNote={p.goalPathNote}
                v6MasterScore={p.v6MasterScore}
                catalogWin={p.catalogWin}
                policyChecklist={p.policyChecklist}
                marketScanSummary={p.v6?.marketScanSummary}
                engineVersion={p.v4?.engineVersion ?? meta.engineVersion}
                recommendedScenarioId={p.v4?.recommendedScenarioId}
                extra={
                  p.landedBreakdown ? (
                    <div className="grid gap-2 sm:grid-cols-3 text-xs">
                      <div className="ts-mini-stat">
                        <p className="text-ts-muted">상품 원가</p>
                        <p className="font-bold">{formatKrw(p.landedBreakdown.productKrw)}</p>
                      </div>
                      <div className="ts-mini-stat">
                        <p className="text-ts-muted">국제배송</p>
                        <p className="font-bold">{formatKrw(p.landedBreakdown.shippingKrw)}</p>
                      </div>
                      <div className="ts-mini-stat">
                        <p className="text-ts-muted">관세</p>
                        <p className="font-bold">{formatKrw(p.landedBreakdown.dutyKrw)}</p>
                      </div>
                    </div>
                  ) : null
                }
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
