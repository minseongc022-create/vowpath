"use client";

import {
  isTrustScoreSufficient,
  TRUST_SCORE_SUFFICIENT_MIN,
  type RequestTrustScore,
  type TrustScoreBand,
} from "@/lib/request-trust-score";
import { dashboardUi } from "@/lib/content";
import { useIsEnglishUi } from "@/components/providers/LocaleProvider";

const BAND_STYLES: Record<
  TrustScoreBand,
  { ring: string; score: string; badge: string; bar: string; track: string }
> = {
  high: {
    ring: "border-emerald-500/30 bg-emerald-500/[0.06]",
    score: "text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
    bar: "bg-emerald-500",
    track: "bg-white/10",
  },
  review: {
    ring: "border-amber-500/30 bg-amber-500/[0.06]",
    score: "text-amber-300",
    badge: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
    bar: "bg-amber-500",
    track: "bg-white/10",
  },
  manual: {
    ring: "border-rose-500/30 bg-rose-500/[0.06]",
    score: "text-rose-300",
    badge: "bg-rose-500/15 text-rose-200 ring-rose-500/30",
    bar: "bg-rose-500",
    track: "bg-white/10",
  },
};

type TrustScorePanelProps = {
  trust: RequestTrustScore;
};

function reassuranceCopy(trust: RequestTrustScore, t: typeof dashboardUi.bookingDetail): string {
  if (!trust.hasLinkedCall) return t.trustNoCallGuide;
  if (trust.band === "high") return t.trustScoreHigh;
  if (isTrustScoreSufficient(trust.score)) return t.trustScoreSufficient;
  return t.trustScoreBelow;
}

export function TrustScorePanel({ trust }: TrustScorePanelProps) {
  const t = dashboardUi.bookingDetail;
  const isEnglish = useIsEnglishUi();
  const sufficient = trust.hasLinkedCall && isTrustScoreSufficient(trust.score);
  const styles =
    sufficient || trust.band === "high" ? BAND_STYLES.high : BAND_STYLES[trust.band];
  const verifiedCount = trust.factors.filter((f) => f.state === "verified").length;

  return (
    <section
      className={`booking-detail-card overflow-visible rounded-2xl border-2 border-white/[0.06] bg-[#161b22] bg-none shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] ${styles.ring}`}
    >
      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {t.trustScore}
          </p>
          <span className="text-[10px] font-medium text-slate-600">
            {t.trustScoreBenchmark} (
            {isEnglish
              ? `${TRUST_SCORE_SUFFICIENT_MIN}+ pts`
              : `${TRUST_SCORE_SUFFICIENT_MIN}점+`}
            )
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <p className={`text-4xl font-bold tabular-nums tracking-tight ${styles.score}`}>
            {trust.score}
            <span className="text-lg font-semibold text-slate-500"> / {trust.maxScore}</span>
          </p>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles.badge}`}
          >
            {trust.bandLabel}
          </span>
        </div>

        <div className={`mt-4 h-2 overflow-hidden rounded-full ${styles.track}`}>
          <div
            className={`h-full rounded-full transition-all ${styles.bar}`}
            style={{ width: `${trust.score}%` }}
          />
        </div>

        <p
          className={`mt-4 rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${
            sufficient
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
              : trust.hasLinkedCall
                ? "border-amber-500/20 bg-amber-500/[0.08] text-amber-100/90"
                : "border-white/[0.08] bg-white/[0.03] text-slate-400"
          }`}
        >
          {reassuranceCopy(trust, t)}
        </p>

        <p className="mt-2 text-xs text-slate-500">
          {trust.hasLinkedCall
            ? t.trustCriteriaMet(verifiedCount, trust.factors.length)
            : t.trustNoCall}
        </p>
      </div>
    </section>
  );
}
