"use client";

import type { TopSellerPlaybookReport } from "@/toss-shop/lib/types";
import { JARVIS_NAME } from "@/toss-shop/lib/seller-engine/jarvis-engine";

export function TopSellerPlaybookPanel({ playbook }: { playbook?: TopSellerPlaybookReport }) {
  if (!playbook) return null;

  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-ts-ink">{JARVIS_NAME} · 검증된 상위셀러 전술</span>
        <span className="font-bold text-violet-700">정렬 {playbook.alignmentScore}%</span>
        <span className="text-ts-muted">
          {playbook.appliedCount}/{playbook.verifiedTacticCount} 적용
        </span>
      </div>
      <p className="mt-1 leading-relaxed text-ts-muted">{playbook.brief}</p>
      {playbook.jarvisActions.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-ts-muted">
          {playbook.jarvisActions.slice(0, 4).map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      {playbook.tactics.filter((t) => t.applied).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {playbook.tactics
            .filter((t) => t.applied)
            .slice(0, 5)
            .map((t) => (
              <span key={t.id} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                ✓ {t.title}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

export function TopSellerPlaybookSummaryCard({
  avgAlignment,
  totalVerified,
}: {
  avgAlignment: number;
  totalVerified: number;
}) {
  return (
    <div className="ts-card">
      <h2 className="text-sm font-bold text-ts-ink">{JARVIS_NAME} 상위셀러 지식베이스</h2>
      <p className="mt-2 text-2xl font-bold text-ts-primary">{avgAlignment}%</p>
      <p className="mt-1 text-xs text-ts-muted">
        토스 공식·도매매·검증된 커뮤니티 전술 {totalVerified}개 중 실제 적용률 평균 · 마케팅 과장 제외
      </p>
    </div>
  );
}
