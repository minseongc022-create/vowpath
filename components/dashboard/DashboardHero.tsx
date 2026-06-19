"use client";

import type { DashboardHomeMetrics } from "@/lib/dashboard-home-metrics";
import { useVowDashboard } from "@/components/providers/LocaleProvider";

type DashboardHeroProps = {
  metrics: DashboardHomeMetrics;
  loading?: boolean;
};

type HeroCopy = ReturnType<typeof useVowDashboard>["hero"];

function HeroStat({
  h,
  label,
  value,
  deltaPct,
  accent,
  loading,
}: {
  h: HeroCopy;
  label: string;
  value: string;
  deltaPct: number;
  accent: "cyan" | "brand" | "rose";
  loading?: boolean;
}) {
  const deltaCls =
    deltaPct > 0
      ? "text-emerald-400/90"
      : deltaPct < 0
        ? "text-rose-400/90"
        : "text-slate-600";

  const valueCls =
    accent === "cyan"
      ? "text-brand-800"
      : accent === "rose"
        ? "text-rose-700"
        : "text-brand-950";

  return (
    <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:border-l lg:border-brand-200/60 first:lg:border-l-0">
      <p className="text-[11px] font-medium uppercase tracking-widest text-stone-600">{label}</p>
      <p
        className={`mt-2 font-bold tabular-nums tracking-tight ${valueCls} ${
          loading ? "animate-pulse opacity-60" : ""
        } vow-dash-hero-value`}
      >
        {loading ? "—" : value}
      </p>
      <p className={`mt-2 text-xs ${deltaCls}`}>
        {deltaPct === 0 ? h.deltaFlat : h.delta(deltaPct)}
      </p>
    </div>
  );
}

export function DashboardHero({ metrics, loading }: DashboardHeroProps) {
  const h = useVowDashboard().hero;

  return (
    <section className="vow-dash-hero">
      <div className="flex flex-col gap-1 border-b border-brand-200/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-700">
            {h.period}
          </p>
          <p className="mt-1 text-sm text-stone-600">{h.tagline}</p>
        </div>
        <p className="text-sm text-stone-500">{metrics.rangeLabel}</p>
      </div>
      <div className="grid grid-cols-1 divide-y divide-brand-200/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <HeroStat
          h={h}
          label={h.callsSaved}
          value={metrics.missedPrevented.display}
          deltaPct={metrics.missedPrevented.deltaPct}
          accent="cyan"
          loading={loading}
        />
        <HeroStat
          h={h}
          label={h.aiAnswered}
          value={metrics.aiAnswered.display}
          deltaPct={metrics.aiAnswered.deltaPct}
          accent="brand"
          loading={loading}
        />
        <HeroStat
          h={h}
          label={h.emergency}
          value={metrics.emergencyRequests.display}
          deltaPct={metrics.emergencyRequests.deltaPct}
          accent="rose"
          loading={loading}
        />
      </div>
    </section>
  );
}
