"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ROUTES } from "@/lib/constants";
import type { CallRecord } from "@/lib/operations-analytics";
import {
  buildMissedCallsPreventedByPeriod,
  type MissedCallsPeriod,
} from "@/lib/missed-calls-prevented";
import { dashboardUi } from "@/lib/content";
import type { ShopState } from "@/lib/types";

type MissedCallsPreventedKpiProps = {
  calls: CallRecord[];
  shop: Pick<ShopState, "scheduleWindows" | "answerScheduleActive">;
  loading?: boolean;
};

export function MissedCallsPreventedKpi({
  calls,
  shop,
  loading,
}: MissedCallsPreventedKpiProps) {
  const k = dashboardUi.missedCallsPrevented;
  const periods: { id: MissedCallsPeriod; label: string }[] = [
    { id: "today", label: k.today },
    { id: "7d", label: k.last7 },
    { id: "30d", label: k.last30 },
    { id: "all", label: k.allTime },
  ];
  const [period, setPeriod] = useState<MissedCallsPeriod>("30d");

  const counts = useMemo(
    () => buildMissedCallsPreventedByPeriod(calls, shop),
    [calls, shop],
  );

  const value = counts[period];
  const periodLabel = periods.find((p) => p.id === period)?.label ?? k.last30;

  return (
    <div className="ops-kpi flex flex-col">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 text-cyan-600 ring-1 ring-slate-200/80">
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M2 3.5A1.5 1.5 0 013.5 2h2.879a1.5 1.5 0 011.06.44l1.122 1.12a.5.5 0 00.353.147H16.5A1.5 1.5 0 0118 5.207v9.043A1.5 1.5 0 0116.5 15.75h-13A1.5 1.5 0 012 14.25V3.5z" />
          <path
            fillRule="evenodd"
            d="M10 6.75a3.25 3.25 0 100 6.5 3.25 3.25 0 000-6.5zM8.75 10a1.25 1.25 0 102.5 0 1.25 1.25 0 00-2.5 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{k.title}</p>

      <p
        className={`mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums ${loading ? "animate-pulse opacity-70" : ""}`}
        aria-live="polite"
      >
        {loading && calls.length === 0 ? "—" : value}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-600">{periodLabel}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {periods.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
              period === p.id
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-slate-500">{k.helper}</p>
      <Link
        href={ROUTES.missedCallsAnalytics}
        className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:underline"
      >
        {k.viewAnalytics}
      </Link>
    </div>
  );
}
