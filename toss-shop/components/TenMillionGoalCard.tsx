"use client";

import { formatKrw } from "@/toss-shop/lib/format";
import type { GoalMilestone, TenMillionPlan } from "@/toss-shop/lib/types";

export function TenMillionGoalCard({ plan }: { plan: TenMillionPlan }) {
  const { progress } = plan;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-ts-primary px-4 py-5 text-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white/90">AI v5 · 월 수익 목표</p>
          <p className="mt-1 text-2xl font-bold">{formatKrw(plan.goalKrw)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/80">genius 로드맵</p>
          <p className="text-xl font-bold">{progress.progressPct}%</p>
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white transition-all"
          style={{ width: `${Math.min(100, progress.progressPct)}%` }}
        />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-white/95">{plan.geniusBrief}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3 text-xs">
        <div className="rounded-xl bg-white/10 px-3 py-2">
          <p className="text-white/70">10선 예상 월수익</p>
          <p className="font-bold">{formatKrw(progress.projectedMonthlyKrw)}</p>
        </div>
        <div className="rounded-xl bg-white/10 px-3 py-2">
          <p className="text-white/70">목표까지</p>
          <p className="font-bold">{formatKrw(progress.gapKrw)}</p>
        </div>
        <div className="rounded-xl bg-white/10 px-3 py-2">
          <p className="text-white/70">권장 활성 SKU</p>
          <p className="font-bold">{plan.requiredActiveSkus}개</p>
        </div>
      </div>

      {plan.topContributors.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-white/80">1순위 실행 SKU</p>
          <p className="mt-1 text-sm font-bold">
            「{plan.topContributors[0].keyword}」 genius {plan.topContributors[0].geniusScore}점 · 목표{" "}
            {plan.topContributors[0].goalSharePct}%
          </p>
        </div>
      )}
    </div>
  );
}

export function GoalMilestonesList({ milestones }: { milestones: GoalMilestone[] }) {
  return (
    <div className="ts-card">
      <h2 className="text-sm font-bold text-ts-ink">12주 · 월 1,000만 원 로드맵</h2>
      <ol className="mt-3 space-y-3">
        {milestones.map((m) => (
          <li key={m.week} className="rounded-xl bg-ts-bg px-3 py-2.5 text-xs">
            <div className="flex flex-wrap justify-between gap-1">
              <span className="font-semibold text-ts-ink">{m.label}</span>
              <span className="text-ts-primary">{formatKrw(m.targetCumulativeKrw)}</span>
            </div>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-ts-muted">
              {m.actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
