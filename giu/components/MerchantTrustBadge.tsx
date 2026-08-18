import { computeMerchantTrust, trustHint, trustLabel } from "@/giu/lib/merchant-trust";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuMerchant, GiuReview } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  merchant: GiuMerchant;
  reviews?: GiuReview[];
};

const TONE_STYLES = {
  good: {
    ring: "ring-emerald-200/80",
    bg: "linear-gradient(135deg, rgba(236,253,245,0.95) 0%, rgba(255,255,255,0.92) 100%)",
    bar: "bg-emerald-500",
    text: "text-emerald-800",
  },
  ok: {
    ring: "ring-amber-200/80",
    bg: "linear-gradient(135deg, rgba(255,251,235,0.95) 0%, rgba(255,255,255,0.92) 100%)",
    bar: "bg-amber-500",
    text: "text-amber-900",
  },
  caution: {
    ring: "ring-orange-200/80",
    bg: "linear-gradient(135deg, rgba(255,247,237,0.95) 0%, rgba(255,255,255,0.92) 100%)",
    bar: "bg-orange-500",
    text: "text-orange-900",
  },
} as const;

export function MerchantTrustBadge({ locale, merchant, reviews = [] }: Props) {
  const trust = computeMerchantTrust(merchant, reviews);
  const style = TONE_STYLES[trust.tone];

  return (
    <section
      className={`giu-panel-enter overflow-hidden rounded-[18px] p-4 ring-1 ${style.ring}`}
      style={{ background: style.bg }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-giu-muted">
            {t(locale, "trustScoreTitle")}
          </p>
          <p className={`mt-1 text-[22px] font-extrabold tracking-tight ${style.text}`}>
            {trust.percent}%
            <span className="ml-2 text-[15px] font-bold">{trustLabel(locale, trust.labelKey)}</span>
          </p>
        </div>
        {merchant.verified ? (
          <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-giu-primary ring-1 ring-giu-border">
            {t(locale, "mVerified")}
          </span>
        ) : null}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70 ring-1 ring-black/[0.04]">
        <div
          className={`h-full rounded-full ${style.bar} transition-all duration-500`}
          style={{ width: `${trust.percent}%` }}
        />
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-giu-muted">
        {trustHint(locale, trust.hintKey)}
      </p>
    </section>
  );
}
