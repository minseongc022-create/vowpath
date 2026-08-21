"use client";

import type { ReactNode } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import type { AnalysisSignal, CompetitorInsight, PricingBreakdown } from "@/toss-shop/lib/types";

function impactClass(impact: AnalysisSignal["impact"]): string {
  if (impact === "positive") return "text-emerald-700 bg-emerald-50";
  if (impact === "negative") return "text-red-700 bg-red-50";
  return "text-ts-muted bg-ts-bg";
}

export function SourcingAnalysisCard({
  winScore,
  suggestedTitle,
  pricing,
  signals,
  actionSteps,
  risks,
  competitors,
  extra,
}: {
  winScore?: number;
  suggestedTitle?: string;
  pricing?: PricingBreakdown;
  signals?: AnalysisSignal[];
  actionSteps?: string[];
  risks?: string[];
  competitors?: CompetitorInsight[];
  extra?: ReactNode;
}) {
  if (!signals?.length && !pricing) return null;

  return (
    <div className="mt-4 space-y-3 border-t border-ts-border pt-4">
      {winScore != null && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ts-muted">AI 승률 점수</span>
          <span className="font-bold text-ts-primary">{winScore}/99</span>
        </div>
      )}

      {suggestedTitle && (
        <div className="rounded-xl bg-ts-bg px-3 py-2 text-xs">
          <p className="font-semibold text-ts-muted">추천 등록 상품명</p>
          <p className="mt-1 font-medium text-ts-ink">{suggestedTitle}</p>
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

      {extra}

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
