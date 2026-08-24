"use client";

/**
 * 효자상품 카드 — 실제 정산 입금액 기준 SKU 등급과 광고비 배분.
 *
 * 이 화면의 숫자는 전부 **실측**이다. 다른 화면(소싱 추천·수익 예측)은
 * 등록 전 추정치지만, 여기는 실제로 들어온 돈만 쓴다. 그래서 광고비를
 * 어디에 태울지는 이 화면이 정한다.
 */

import { useCallback, useEffect, useState } from "react";
import type { WinnerReport, WinnerSku } from "@/toss-shop/lib/seller-engine/winner-sku-engine";
import type { AdBudgetPlan } from "@/toss-shop/lib/seller-engine/ad-budget-allocator";

const GRADE_STYLE: Record<WinnerSku["grade"], { label: string; cls: string }> = {
  hero: { label: "효자", cls: "bg-emerald-100 text-emerald-900" },
  rising: { label: "육성", cls: "bg-sky-100 text-sky-900" },
  steady: { label: "유지", cls: "bg-slate-100 text-slate-700" },
  declining: { label: "하락", cls: "bg-amber-100 text-amber-900" },
  drain: { label: "정리", cls: "bg-red-100 text-red-800" },
  insufficient_data: { label: "판정보류", cls: "bg-slate-100 text-slate-500" },
};

function won(n: number): string {
  return `${n.toLocaleString()}원`;
}

function SkuRow({ sku, budgetKrw }: { sku: WinnerSku; budgetKrw?: number }) {
  const g = GRADE_STYLE[sku.grade];
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2 text-xs ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-bold text-slate-900">{sku.productName}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${g.cls}`}>
          {g.label}
        </span>
      </div>
      <p className="mt-1 text-slate-600">
        월 {won(sku.monthlyNetKrw)} · 목표의 {sku.goalSharePct}% · 추세{" "}
        <span className={sku.trendPct >= 0 ? "text-emerald-700" : "text-red-700"}>
          {sku.trendPct >= 0 ? "+" : ""}
          {sku.trendPct}%
        </span>{" "}
        · {sku.orders}건/{sku.activeDays}일
      </p>
      {budgetKrw !== undefined && budgetKrw > 0 && (
        <p className="mt-1 font-semibold text-violet-700">광고 일 {won(budgetKrw)} 배분</p>
      )}
      {sku.actions[0] && <p className="mt-1 text-[11px] text-slate-500">→ {sku.actions[0]}</p>}
    </div>
  );
}

export function WinnerSkuCard({ dailyAdBudgetKrw }: { dailyAdBudgetKrw?: number }) {
  const [report, setReport] = useState<WinnerReport | null>(null);
  const [adPlan, setAdPlan] = useState<AdBudgetPlan | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const qs = dailyAdBudgetKrw ? `?budget=${dailyAdBudgetKrw}` : "";
    const res = await fetch(`/api/toss-shop/jarvis/winners${qs}`);
    if (res.ok) {
      const json = (await res.json()) as { winners?: WinnerReport; adPlan?: AdBudgetPlan | null };
      setReport(json.winners ?? null);
      setAdPlan(json.adPlan ?? null);
    }
    setLoaded(true);
  }, [dailyAdBudgetKrw]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) return null;

  const budgetByName = new Map(
    (adPlan?.allocations ?? []).map((a) => [a.productName, a.dailyBudgetKrw]),
  );

  // 판정 보류는 목록 하단으로 — 조치할 게 없는 항목이 위를 차지하면 안 된다
  const ranked = [...(report?.skus ?? [])].sort((a, b) => {
    const pending = (s: WinnerSku) => (s.grade === "insufficient_data" ? 1 : 0);
    return pending(a) - pending(b) || b.monthlyNetKrw - a.monthlyNetKrw;
  });

  return (
    <section className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-4 ring-1 ring-emerald-100">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-black text-emerald-950">효자상품 (실정산 기준)</h2>
        {report && report.settlementCount > 0 && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
            목표 {report.goalProgressPct}%
          </span>
        )}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-emerald-900/80">{report?.brief}</p>

      {report && report.settlementCount > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white/70 px-2 py-2 ring-1 ring-emerald-100">
            <p className="text-[11px] text-slate-500">실측 월순익</p>
            <p className="text-sm font-black text-emerald-900">
              {(report.actualMonthlyNetKrw / 10000).toLocaleString()}만
            </p>
          </div>
          <div className="rounded-lg bg-white/70 px-2 py-2 ring-1 ring-emerald-100">
            <p className="text-[11px] text-slate-500">효자</p>
            <p className="text-sm font-black text-emerald-900">{report.heroes.length}개</p>
          </div>
          <div className="rounded-lg bg-white/70 px-2 py-2 ring-1 ring-emerald-100">
            <p className="text-[11px] text-slate-500">목표까지</p>
            <p className="text-sm font-black text-emerald-900">
              효자 {report.heroesNeededForGoal}개
            </p>
          </div>
        </div>
      )}

      {adPlan && (
        <div className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-xs ring-1 ring-violet-100">
          <p className="font-bold text-violet-950">광고비 배분</p>
          <p className="mt-0.5 text-violet-800/90">{adPlan.brief}</p>
        </div>
      )}

      {ranked.length > 0 && (
        <div className="mt-3 space-y-2">
          {ranked.slice(0, 8).map((sku) => (
            <SkuRow key={sku.productName} sku={sku} budgetKrw={budgetByName.get(sku.productName)} />
          ))}
        </div>
      )}

      {(report?.nextActions.length ?? 0) > 0 && (
        <ul className="mt-3 space-y-1 text-[11px] text-emerald-900/80">
          {report!.nextActions.slice(0, 4).map((a) => (
            <li key={a}>· {a}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
