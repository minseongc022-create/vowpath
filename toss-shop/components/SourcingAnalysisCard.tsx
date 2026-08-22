"use client";

import type { ReactNode } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import type {
  AnalysisSignal,
  CatalogStrategyPlan,
  CatalogWinAnalysis,
  CompetitorInsight,
  ImportSourceBundle,
  ImportSourceListing,
  PolicyFlag,
  PricingBreakdown,
  PricingScenario,
  ProfitPlaybookItem,
  RevenueForecast,
  WholesaleListing,
} from "@/toss-shop/lib/types";

function impactClass(impact: AnalysisSignal["impact"]): string {
  if (impact === "positive") return "text-emerald-700 bg-emerald-50";
  if (impact === "negative") return "text-red-700 bg-red-50";
  return "text-ts-muted bg-ts-bg";
}

function roiClass(roi: ProfitPlaybookItem["roi"]): string {
  if (roi === "high") return "text-emerald-700";
  if (roi === "medium") return "text-amber-700";
  return "text-ts-muted";
}

export function SourcingAnalysisCard({
  winScore,
  profitScore,
  suggestedTitle,
  pricing,
  signals,
  actionSteps,
  risks,
  competitors,
  aiSummary,
  competitorLandscape,
  pricingScenarios,
  revenueForecast,
  profitPlaybook,
  keywordCluster,
  moatOpportunities,
  engineVersion,
  recommendedScenarioId,
  wholesaleMatches,
  wholesaleBest,
  wholesaleApiLive,
  autoSourcingSteps,
  importSources,
  importBest,
  sourcingBrief,
  geniusScore,
  goalSharePct,
  goalPathNote,
  v6MasterScore,
  catalogWin,
  catalogStrategy,
  policyChecklist,
  marketScanSummary,
  extra,
}: {
  winScore?: number;
  profitScore?: number;
  suggestedTitle?: string;
  pricing?: PricingBreakdown;
  signals?: AnalysisSignal[];
  actionSteps?: string[];
  risks?: string[];
  competitors?: CompetitorInsight[];
  aiSummary?: string;
  competitorLandscape?: {
    count: number;
    priceSpreadPct: number;
    dominance: string;
    highThreatCount: number;
  };
  pricingScenarios?: PricingScenario[];
  revenueForecast?: RevenueForecast;
  profitPlaybook?: ProfitPlaybookItem[];
  keywordCluster?: string[];
  moatOpportunities?: string[];
  engineVersion?: string;
  recommendedScenarioId?: string;
  wholesaleMatches?: WholesaleListing[];
  wholesaleBest?: WholesaleListing | null;
  wholesaleApiLive?: boolean;
  autoSourcingSteps?: string[];
  importSources?: ImportSourceBundle;
  importBest?: ImportSourceListing | null;
  sourcingBrief?: string;
  geniusScore?: number;
  goalSharePct?: number;
  goalPathNote?: string;
  v6MasterScore?: number;
  catalogWin?: CatalogWinAnalysis;
  catalogStrategy?: CatalogStrategyPlan;
  policyChecklist?: string[];
  marketScanSummary?: string;
  extra?: ReactNode;
}) {
  if (!signals?.length && !pricing && !aiSummary) return null;

  const recommendedId = recommendedScenarioId ?? pricingScenarios?.[0]?.id;

  return (
    <div className="mt-4 space-y-3 border-t border-ts-border pt-4">
      {engineVersion && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-ts-primary px-2 py-0.5 font-bold text-white">
            AI {engineVersion}
          </span>
          {profitScore != null && (
            <span className="font-semibold text-ts-primary">수익 {profitScore}/99</span>
          )}
          {geniusScore != null && (
            <span className="font-bold text-violet-600">genius {geniusScore}</span>
          )}
          {v6MasterScore != null && (
            <span className="font-bold text-indigo-600">v6 {v6MasterScore}</span>
          )}
          {goalSharePct != null && (
            <span className="text-ts-muted">목표 {goalSharePct}%</span>
          )}
          {winScore != null && (
            <span className="text-ts-muted">승률 {winScore}/99</span>
          )}
        </div>
      )}

      {goalPathNote && (
        <p className="text-xs text-violet-700">{goalPathNote}</p>
      )}

      {marketScanSummary && (
        <div className="rounded-xl bg-indigo-50 px-3 py-2.5 text-xs leading-relaxed text-indigo-900 ring-1 ring-indigo-100">
          <p className="font-semibold">시장 전체 스캔 (v6)</p>
          <p className="mt-1">{marketScanSummary}</p>
        </div>
      )}

      {catalogStrategy && (
        <div
          className={`rounded-xl px-3 py-2.5 text-xs ring-1 ${
            catalogStrategy.mode === "win_representative"
              ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
              : "bg-amber-50 text-amber-950 ring-amber-200"
          }`}
        >
          <p className="font-bold">
            {catalogStrategy.mode === "win_representative"
              ? "전략 A · 대표 아이템(Item Winner) 선점"
              : "전략 B · Item Winner 회피 · 별도 카탈로그"}
            {catalogStrategy.isolationScore != null && (
              <span className="ml-2 font-semibold">isolation {catalogStrategy.isolationScore}</span>
            )}
          </p>
          <p className="mt-1 leading-relaxed">{catalogStrategy.rationale}</p>
          {catalogStrategy.recommendedTitle && (
            <p className="mt-2 font-medium">
              권장 등록명: {catalogStrategy.recommendedTitle}
            </p>
          )}
        </div>
      )}

      {catalogWin && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-2.5 text-xs">
          <p className="font-semibold text-indigo-900">
            토스 카탈로그 · 대표 아이템 (Item Winner)
            <span className="ml-2 font-bold text-indigo-700">{catalogWin.representativeItemScore}/99</span>
          </p>
          <p className="mt-1 text-indigo-800/90">{catalogWin.policyBrief}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <div className="ts-mini-stat">
              <p className="text-indigo-700/70">우리 총액</p>
              <p className="font-bold">{formatKrw(catalogWin.ourTotalPriceKrw)}</p>
            </div>
            <div className="ts-mini-stat">
              <p className="text-indigo-700/70">최저 경쟁 총액</p>
              <p className="font-bold">{formatKrw(catalogWin.bestCompetitorTotalKrw)}</p>
            </div>
            <div className="ts-mini-stat">
              <p className="text-indigo-700/70">카탈로그 리스크</p>
              <p className="font-bold">
                {catalogWin.catalogMatchRisk === "high"
                  ? "높음"
                  : catalogWin.catalogMatchRisk === "low"
                    ? "낮음"
                    : "보통"}
              </p>
            </div>
          </div>
          {catalogWin.winStrategy.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-indigo-800/85">
              {catalogWin.winStrategy.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {catalogWin.policyFlags.length > 0 && (
            <ul className="mt-2 space-y-1">
              {catalogWin.policyFlags.map((f: PolicyFlag) => (
                <li
                  key={f.code}
                  className={`rounded px-2 py-1 ${
                    f.level === "block"
                      ? "bg-red-100 text-red-800"
                      : f.level === "warn"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-white/60 text-indigo-800"
                  }`}
                >
                  {f.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {policyChecklist && policyChecklist.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ts-muted">토스 정책 · 등록 체크리스트</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-ts-muted">
            {policyChecklist.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {aiSummary && (
        <div className="rounded-xl bg-ts-primary/5 px-3 py-2.5 text-xs leading-relaxed text-ts-ink ring-1 ring-ts-primary/15">
          <p className="font-semibold text-ts-primary">AI 종합 분석</p>
          <p className="mt-1">{aiSummary}</p>
        </div>
      )}

      {sourcingBrief && (
        <div className="rounded-xl bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-900 ring-1 ring-sky-100">
          <p className="font-semibold">해외 소싱 AI 브리핑</p>
          <p className="mt-1">{sourcingBrief}</p>
        </div>
      )}

      {wholesaleBest && (
        <div className="rounded-xl border border-ts-border bg-white px-3 py-2.5 text-xs">
          <p className="font-semibold text-ts-ink">
            위탁 공급처 · {wholesaleBest.platform === "domeggook" ? "도매꾹" : "도매매"}
            {wholesaleApiLive && wholesaleBest.source === "live" && (
              <span className="ml-1 text-emerald-600">실시간 API</span>
            )}
          </p>
          <p className="mt-1 font-medium">{wholesaleBest.title}</p>
          <p className="mt-1 text-ts-muted">
            공급가 {formatKrw(wholesaleBest.unitPriceKrw)}
            {!wholesaleBest.freeShipping && ` + 배송 ${formatKrw(wholesaleBest.shippingFeeKrw)}`}
            {wholesaleBest.marginVsTossPct != null && ` · 예상 마진 ${wholesaleBest.marginVsTossPct}%`}
          </p>
          <a
            href={wholesaleBest.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-semibold text-ts-primary underline"
          >
            공급처 바로가기 →
          </a>
        </div>
      )}

      {wholesaleMatches && wholesaleMatches.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-ts-muted">도매꾹·도매매 후보</p>
          <ul className="mt-1 space-y-1 text-xs">
            {wholesaleMatches.slice(0, 4).map((w) => (
              <li key={`${w.platform}-${w.itemNo ?? w.title}`}>
                <a href={w.url} target="_blank" rel="noopener noreferrer" className="text-ts-primary underline">
                  [{w.platform === "domeggook" ? "도매꾹" : "도매매"}] {w.title.slice(0, 28)} ·{" "}
                  {formatKrw(w.unitPriceKrw)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {importBest && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2.5 text-xs">
          <p className="font-semibold text-emerald-900">
            수입 소싱 · {importBest.country}{" "}
            {importBest.platform === "1688"
              ? "1688"
              : importBest.platform === "taobao"
                ? "타오바오"
                : importBest.platform === "rakuten"
                  ? "라쿠텐"
                  : "Yahoo"}
          </p>
          <p className="mt-1">{importBest.title}</p>
          <p className="mt-1 text-emerald-800/80">
            FOB ${importBest.sourcePriceUsd} · 랜딩 {formatKrw(importBest.landedCostKrw ?? 0)} · 마진{" "}
            {importBest.estimatedMarginPct ?? 0}%
          </p>
          <a
            href={importBest.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-semibold text-emerald-800 underline"
          >
            {importBest.country} 소싱 검색 바로가기 →
          </a>
        </div>
      )}

      {importSources && (importSources.china.length > 0 || importSources.japan.length > 0) && (
        <div className="text-xs">
          <p className="font-semibold text-ts-muted">중국·일본 소싱 링크</p>
          <ul className="mt-1 space-y-1">
            {[...importSources.china.slice(0, 2), ...importSources.japan.slice(0, 2)].map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-ts-primary underline">
                  [{s.country}] {s.platform} · 마진 {s.estimatedMarginPct ?? 0}%
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {autoSourcingSteps && autoSourcingSteps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ts-primary">AI 자동 위탁 플로우</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-ts-muted">
            {autoSourcingSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {revenueForecast && (
        <div className="rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-100">
          <p className="text-xs font-semibold text-emerald-900">수익 예측 (AI v4)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs">
            <div>
              <p className="text-emerald-800/70">일 예상</p>
              <p className="font-bold text-emerald-900">{formatKrw(revenueForecast.dailyProfitKrw)}</p>
            </div>
            <div>
              <p className="text-emerald-800/70">월 예상</p>
              <p className="font-bold text-emerald-900">{formatKrw(revenueForecast.monthlyProfitKrw)}</p>
            </div>
            <div>
              <p className="text-emerald-800/70">낙관~보수</p>
              <p className="font-bold text-emerald-900">
                {formatKrw(revenueForecast.conservativeMonthlyKrw)}~
                {formatKrw(revenueForecast.optimisticMonthlyKrw)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-emerald-800/80">{revenueForecast.seasonalityNote}</p>
        </div>
      )}

      {pricingScenarios && pricingScenarios.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ts-muted">가격 시나리오 (월수익 기준 최적 선택)</p>
          <ul className="mt-2 space-y-1.5">
            {pricingScenarios.map((s) => (
              <li
                key={s.id}
                className={`rounded-lg px-2.5 py-1.5 text-xs ${
                  s.id === recommendedId ? "bg-ts-primary/10 ring-1 ring-ts-primary/30" : "bg-ts-bg"
                }`}
              >
                <div className="flex flex-wrap justify-between gap-1">
                  <span className="font-semibold">
                    {s.label}
                    {s.id === recommendedId && (
                      <span className="ml-1 text-ts-primary">★ 추천</span>
                    )}
                  </span>
                  <span className="font-bold">{formatKrw(s.priceKrw)}</span>
                </div>
                <p className="mt-0.5 text-ts-muted">
                  월 {formatKrw(s.estimatedMonthlyProfitKrw)} · 마진 {s.marginPct}% · 일 {s.estimatedDailyUnits}개
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestedTitle && (
        <div className="rounded-xl bg-ts-bg px-3 py-2 text-xs">
          <p className="font-semibold text-ts-muted">추천 등록 상품명</p>
          <p className="mt-1 font-medium text-ts-ink">{suggestedTitle}</p>
        </div>
      )}

      {keywordCluster && keywordCluster.length > 1 && (
        <div className="text-xs">
          <p className="font-semibold text-ts-muted">연관 키워드 클러스터 (SEO)</p>
          <p className="mt-1 flex flex-wrap gap-1">
            {keywordCluster.map((k) => (
              <span key={k} className="rounded-full bg-ts-bg px-2 py-0.5 text-ts-ink ring-1 ring-ts-border">
                {k}
              </span>
            ))}
          </p>
        </div>
      )}

      {pricing && (
        <div className="grid gap-2 sm:grid-cols-3 text-xs">
          <div className="ts-mini-stat">
            <p className="text-ts-muted">가격 하한</p>
            <p className="font-bold">{formatKrw(pricing.priceFloorKrw)}</p>
          </div>
          <div className="ts-mini-stat">
            <p className="text-ts-muted">경쟁 중위가</p>
            <p className="font-bold">{formatKrw(pricing.competitorMedianKrw)}</p>
          </div>
          <div className="ts-mini-stat">
            <p className="text-ts-muted">순이익/개</p>
            <p className="font-bold text-ts-primary">{formatKrw(pricing.netProfitKrw)}</p>
          </div>
        </div>
      )}

      {competitorLandscape && competitorLandscape.count > 0 && (
        <div className="grid gap-2 sm:grid-cols-3 text-xs">
          <div className="ts-mini-stat">
            <p className="text-ts-muted">경쟁사</p>
            <p className="font-bold">{competitorLandscape.count}곳</p>
          </div>
          <div className="ts-mini-stat">
            <p className="text-ts-muted">가격 스프레드</p>
            <p className="font-bold">{competitorLandscape.priceSpreadPct}%</p>
          </div>
          <div className="ts-mini-stat">
            <p className="text-ts-muted">시장 구조</p>
            <p className="font-bold">
              {competitorLandscape.dominance === "fragmented"
                ? "분산형"
                : competitorLandscape.dominance === "concentrated"
                  ? "집중형"
                  : "균형형"}
            </p>
          </div>
        </div>
      )}

      {moatOpportunities && moatOpportunities.length > 0 && (
        <div className="rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-900">
          <p className="font-semibold">차별화 · 경쟁 우위 포인트</p>
          <ul className="mt-1 list-disc pl-4">
            {moatOpportunities.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {extra}

      {profitPlaybook && profitPlaybook.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ts-muted">수익 극대화 플레이북</p>
          <ol className="mt-2 space-y-1.5">
            {profitPlaybook.map((item) => (
              <li key={item.priority} className="rounded-lg bg-ts-bg px-2.5 py-1.5 text-xs">
                <div className="flex flex-wrap justify-between gap-1">
                  <span className="font-semibold">
                    {item.priority}. {item.action}
                  </span>
                  <span className={`font-semibold ${roiClass(item.roi)}`}>
                    +{formatKrw(item.expectedImpactKrw)}
                  </span>
                </div>
                <p className="mt-0.5 text-ts-muted">{item.timeframe}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {signals && signals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ts-muted">AI 분석 시그널</p>
          <ul className="mt-2 space-y-1.5">
            {signals.map((s) => (
              <li key={s.label} className={`rounded-lg px-2.5 py-1.5 text-xs ${impactClass(s.impact)}`}>
                <span className="font-semibold">{s.label}</span> · {s.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {competitors && competitors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ts-muted">경쟁사 심층 분석</p>
          <ul className="mt-1 space-y-1 text-xs">
            {competitors.map((c) => (
              <li key={`${c.sellerName}-${c.priceKrw}`} className="flex flex-wrap justify-between gap-1">
                <span>
                  {c.sellerName}
                  {c.threat === "high" && <span className="ml-1 text-red-600">⚠ 고위험</span>}
                </span>
                <span className="text-ts-muted">
                  {formatKrw(c.priceKrw)} · #{c.rank}
                  {c.priceGapPct != null && ` · ${c.priceGapPct > 0 ? "+" : ""}${c.priceGapPct}%`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {actionSteps && actionSteps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ts-muted">실행 체크리스트</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-ts-muted">
            {actionSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {risks && risks.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-semibold">리스크</p>
          <ul className="mt-1 list-disc pl-4">
            {risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
