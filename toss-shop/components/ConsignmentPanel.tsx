"use client";

import { useCallback, useState } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { ConsignmentPick } from "@/toss-shop/lib/types";
import { UpgradeBanner } from "@/toss-shop/components/UpgradeBanner";
import { SourcingAnalysisCard } from "@/toss-shop/components/SourcingAnalysisCard";
import { JARVIS_NAME } from "@/toss-shop/lib/seller-engine/jarvis-engine";

type Meta = {
  dataQuality?: string;
  catalogSize?: number;
  marketKeywordCount?: number;
  engineVersion?: string;
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
      engineVersion?: string;
    };
    setPicks(data.picks ?? []);
    setMeta({
      dataQuality: data.dataQuality,
      catalogSize: data.catalogSize,
      marketKeywordCount: data.marketKeywordCount,
      engineVersion: data.engineVersion,
    });
    setBlocked(false);
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  if (blocked) return <UpgradeBanner feature="위탁판매 AI 추천" />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-ts-primary/10 px-4 py-3 text-sm text-ts-ink ring-1 ring-ts-primary/20">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold">{JARVIS_NAME} 위탁 소싱 · 오늘 5선</p>
          {meta.engineVersion && (
            <span className="rounded-full bg-ts-primary px-2 py-0.5 text-xs font-bold text-white">
              {meta.engineVersion.toUpperCase()}
            </span>
          )}
        </div>
        <p className="mt-1 text-ts-muted">
          도매매 단품(MOQ≤1) 우선 · 93% 인증 SKU · 월 1천만 경로
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
                <span className="ts-grade-badge ts-grade-good">
                  {p.jarvis?.certified
                    ? `Jarvis ${p.jarvis.confidencePct}%`
                    : p.jarvis
                      ? `Jarvis ${p.jarvis.confidencePct}%`
                      : `${p.geniusScore ?? p.profitScore ?? p.winScore ?? p.confidenceScore}`}
                </span>
              </div>

              <div className="ts-metric-grid mt-4">
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">AI 추천 판매가</p>
                  <p className="ts-metric-value text-lg">{formatKrw(p.recommendedPriceKrw)}</p>
                </div>
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">월 예상 수익</p>
                  <p className="ts-metric-value text-lg text-ts-primary">
                    {formatKrw(p.estimatedMonthlyProfitKrw ?? p.estimatedDailyProfitKrw * 30)}
                  </p>
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
                profitScore={p.profitScore}
                suggestedTitle={p.suggestedTitle}
                pricing={p.pricing}
                signals={p.signals}
                actionSteps={p.actionSteps}
                autoSourcingSteps={p.autoSourcingSteps}
                risks={p.risks}
                competitors={p.competitorInsights}
                aiSummary={p.aiSummary}
                competitorLandscape={p.competitorLandscape}
                pricingScenarios={p.pricingScenarios}
                revenueForecast={p.revenueForecast}
                profitPlaybook={p.profitPlaybook}
                keywordCluster={p.v4?.keywordCluster}
                moatOpportunities={p.v4?.moatOpportunities}
                engineVersion={p.v4?.engineVersion ?? meta.engineVersion}
                recommendedScenarioId={p.v4?.recommendedScenarioId}
                wholesaleMatches={p.wholesaleMatches}
                wholesaleBest={p.wholesaleBest}
                wholesaleApiLive={p.wholesaleApiLive}
                geniusScore={p.geniusScore}
                goalSharePct={p.goalSharePct}
                goalPathNote={p.goalPathNote}
                v6MasterScore={p.v6MasterScore}
                catalogWin={p.catalogWin}
                catalogStrategy={p.catalogStrategy ?? p.catalogWin?.catalogStrategy}
                policyChecklist={p.policyChecklist}
                riskPlaybook={p.riskPlaybook ?? p.v6?.riskPlaybook}
                jarvis={p.jarvis}
                topSellerPlaybook={p.topSellerPlaybook}
                marketScanSummary={p.v6?.marketScanSummary}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
