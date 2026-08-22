"use client";

import type { JarvisConfidenceReport } from "@/toss-shop/lib/types";
import { JARVIS_NAME } from "@/toss-shop/lib/seller-engine/jarvis-engine";

export function JarvisBadge({ jarvis }: { jarvis?: JarvisConfidenceReport }) {
  if (!jarvis) return null;

  return (
    <div
      className={`rounded-xl px-3 py-2.5 text-xs ring-1 ${
        jarvis.jackpotCertified
          ? "bg-gradient-to-r from-amber-50 to-violet-50 text-violet-950 ring-violet-200"
          : jarvis.certified
            ? "bg-violet-50 text-violet-900 ring-violet-200"
            : "bg-slate-50 text-slate-800 ring-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-600 px-2 py-0.5 font-bold text-white">{JARVIS_NAME}</span>
        <span className="font-bold">신뢰 {jarvis.confidencePct}%</span>
        {jarvis.jackpotCertified && (
          <span className="font-bold text-amber-700">대박 {jarvis.jackpotPct}%</span>
        )}
        {jarvis.certified && (
          <span className="text-emerald-700 font-semibold">90%+ 인증</span>
        )}
      </div>
      <p className="mt-1 leading-relaxed">{jarvis.brief}</p>
      <p className="mt-1 text-[11px] opacity-80">{jarvis.monthlyPathNote}</p>
      {!jarvis.integration.readyFor90 && jarvis.integration.missing.length > 0 && (
        <p className="mt-2 text-[11px] font-medium text-amber-800">
          연동 {jarvis.integration.score}% · 남은 항목: {jarvis.integration.missing.join(" · ")}
        </p>
      )}
    </div>
  );
}

export function JarvisIntegrationCard({
  score,
  missing,
  ready,
  certifiedCount,
  avgConfidence,
}: {
  score: number;
  missing: string[];
  ready: boolean;
  certifiedCount?: number;
  avgConfidence?: number;
}) {
  return (
    <div className="ts-card">
      <h2 className="text-sm font-bold text-ts-ink">{JARVIS_NAME} 연동 상태</h2>
      <p className="mt-2 text-2xl font-bold text-ts-primary">{score}%</p>
      <p className="mt-1 text-xs text-ts-muted">
        {ready
          ? "연동 완료 — 90%+ 인증 SKU만 월 1,000만 원 경로에 사용합니다."
          : "90% 인증을 위해 아래 항목을 완료하세요. (가짜 90% 없음 — 게이트 통과 시에만 인증)"}
      </p>
      {certifiedCount != null && (
        <p className="mt-2 text-xs font-semibold text-violet-800">
          오늘 90% 인증 SKU {certifiedCount}개 · 평균 신뢰 {avgConfidence ?? 0}%
        </p>
      )}
      {!ready && missing.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-ts-muted">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
