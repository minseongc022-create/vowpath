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
    ring: "border-emerald-200 bg-emerald-50/50",
    score: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    bar: "bg-emerald-600",
    track: "bg-stone-200",
  },
  review: {
    ring: "border-amber-200 bg-amber-50/50",
    score: "text-amber-700",
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
    bar: "bg-amber-500",
    track: "bg-stone-200",
  },
  manual: {
    ring: "border-rose-200 bg-rose-50/50",
    score: "text-rose-700",
    badge: "bg-rose-100 text-rose-800 ring-rose-200",
    bar: "bg-rose-500",
    track: "bg-stone-200",
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
    <section className={`booking-detail-card border-2 ${styles.ring}`}>
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
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : trust.hasLinkedCall
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-brand-200 bg-brand-50/60 text-stone-600"
          }`}
        >
          {reassuranceCopy(trust, t)}
        </p>

        <p className="mt-2 text-xs text-stone-500">
          {trust.hasLinkedCall
            ? t.trustCriteriaMet(verifiedCount, trust.factors.length)
            : t.trustNoCall}
        </p>
      </div>
    </section>
  );
}
