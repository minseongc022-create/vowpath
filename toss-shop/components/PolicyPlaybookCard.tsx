"use client";

import type { PenaltyTierBrief, RiskPlaybookReport } from "@/toss-shop/lib/types";
import { TOSS_PENALTY_TIER } from "@/toss-shop/lib/seller-engine/risk-playbook";
import { TOSS_POLICY_BRIEF } from "@/toss-shop/lib/seller-engine/policy-engine";

const CATEGORY_LABELS: Record<string, string> = {
  catalog: "카탈로그",
  shipping: "배송",
  prohibited: "금지품목",
  pricing: "가격",
  coupon: "쿠폰",
  disclosure: "고시",
  certification: "인증",
  cs_returns: "CS·반품",
  listing: "등록",
  commercial: "거래",
  import: "수입",
  penalty: "페널티",
};

function levelClass(level: string): string {
  if (level === "critical") return "bg-red-100 text-red-900 ring-red-200";
  if (level === "block") return "bg-red-50 text-red-800 ring-red-100";
  if (level === "warn") return "bg-amber-50 text-amber-900 ring-amber-100";
  return "bg-slate-50 text-slate-700 ring-slate-100";
}

export function PolicyPlaybookSummaryCard({
  avgSafetyScore,
  totalRisks,
  criticalCount,
}: {
  avgSafetyScore: number;
  totalRisks: number;
  criticalCount: number;
}) {
  return (
    <div className="ts-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ts-ink">토스 정책 · 리스크 플레이북</h2>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
          v6.2
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
        <div className="rounded-xl bg-ts-bg px-3 py-2">
          <p className="text-ts-muted">10선 평균 안전점수</p>
          <p className="text-lg font-bold text-ts-primary">{avgSafetyScore}/99</p>
        </div>
        <div className="rounded-xl bg-ts-bg px-3 py-2">
          <p className="text-ts-muted">탐지 리스크</p>
          <p className="text-lg font-bold">{totalRisks}건</p>
        </div>
        <div className="rounded-xl bg-ts-bg px-3 py-2">
          <p className="text-ts-muted">즉시 수정 필요</p>
          <p className={`text-lg font-bold ${criticalCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {criticalCount}건
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ts-muted">
        30일 누적 <strong>{TOSS_PENALTY_TIER.suspendThreshold}점</strong> → 이용정지 · Item Winner·배송·금지품목·직거래 등 AI가
        상품별로 사전 점검합니다.
      </p>
    </div>
  );
}

export function PenaltyTierList({ tier = TOSS_PENALTY_TIER }: { tier?: PenaltyTierBrief }) {
  return (
    <details className="ts-card group">
      <summary className="cursor-pointer text-sm font-bold text-ts-ink list-none flex justify-between">
        토스 페널티 TOP 10 (30일 {tier.suspendThreshold}점 정지)
        <span className="text-ts-muted group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <ul className="mt-3 space-y-1 text-xs">
        {tier.topViolations.map((v) => (
          <li key={v.label} className="flex justify-between gap-2 rounded-lg bg-ts-bg px-2 py-1.5">
            <span className="text-ts-muted">{v.label}</span>
            <span className="font-bold text-red-700">{v.points}점</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function RiskPlaybookPanel({ report }: { report: RiskPlaybookReport }) {
  if (!report.risks.length) return null;

  const topRisks = report.risks.filter((r) => r.level !== "info").slice(0, 6);
  const show = topRisks.length ? topRisks : report.risks.slice(0, 4);

  return (
    <div className="mt-3 space-y-2 border-t border-ts-border pt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-ts-ink">마켓플레이스 리스크</span>
        <span className="font-semibold text-emerald-700">안전 {report.overallSafetyScore}</span>
        {report.penaltyExposurePoints > 0 && (
          <span className="text-ts-muted">노출 {report.penaltyExposurePoints}점</span>
        )}
      </div>
      <p className="text-xs text-ts-muted">{report.playbookBrief}</p>
      <ul className="space-y-1.5">
        {show.map((r) => (
          <li key={r.code} className={`rounded-lg px-2.5 py-2 text-xs ring-1 ${levelClass(r.level)}`}>
            <div className="flex flex-wrap justify-between gap-1">
              <span className="font-semibold">
                [{CATEGORY_LABELS[r.category] ?? r.category}] {r.title}
              </span>
              {r.penaltyPoints != null && <span>{r.penaltyPoints}점</span>}
            </div>
            <p className="mt-0.5 opacity-90">{r.message}</p>
            {r.mitigation[0] && <p className="mt-1 font-medium">→ {r.mitigation[0]}</p>}
          </li>
        ))}
      </ul>
      {report.mandatoryActions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ts-primary">필수 완화 액션</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-ts-muted">
            {report.mandatoryActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function TossPolicyBriefPanel() {
  const b = TOSS_POLICY_BRIEF;
  return (
    <details className="ts-card group">
      <summary className="cursor-pointer text-sm font-bold text-ts-ink list-none">
        토스쇼핑 정책 요약 · 카탈로그·대표아이템
      </summary>
      <div className="mt-3 space-y-3 text-xs text-ts-muted">
        <p>{b.catalogModel}</p>
        <div>
          <p className="font-semibold text-ts-ink">대표 아이템 기준</p>
          <ul className="mt-1 list-disc pl-4">
            {b.representativeItemCriteria.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-ts-ink">셀러 의무</p>
          <ul className="mt-1 list-disc pl-4">
            {b.sellerObligations.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
