import {
  boxHasFreshnessTrust,
  formatBestBefore,
  formatMadeAt,
  storageMethodLabel,
} from "@/giu/lib/freshness";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuBox } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  box: GiuBox;
  compact?: boolean;
};

function TrustRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[13px]"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800/80">{label}</p>
        <p className="mt-0.5 text-[13px] font-semibold leading-snug text-giu-ink">{value}</p>
      </div>
    </div>
  );
}

export function ProductFreshnessTrust({ locale, box, compact }: Props) {
  if (!boxHasFreshnessTrust(box)) return null;

  const storageLabel =
    box.storageMethod === "other" && box.storageCustom
      ? box.storageCustom
      : box.storageMethod
        ? storageMethodLabel(box.storageMethod, locale)
        : "";

  return (
    <section
      className={`giu-freshness-trust giu-panel-enter overflow-hidden rounded-[20px] ring-1 ring-emerald-200/70 ${
        compact ? "p-3.5" : "p-4"
      }`}
      style={{
        background:
          "linear-gradient(165deg, rgba(236,253,245,0.95) 0%, rgba(255,255,255,0.92) 48%, rgba(255,248,231,0.85) 100%)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white shadow-[0_6px_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-100"
          aria-hidden
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
            <path
              d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3L12 14.8 7.2 16.6l.9-5.3L4.3 7.6l5.3-.8L12 2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 13.5l2 2 5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold tracking-tight text-giu-ink">
            {t(locale, "freshTrustTitle")}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-giu-muted">
            {t(locale, "freshTrustSub")}
          </p>
        </div>
      </div>

      <div className={`space-y-3 ${compact ? "mt-3" : "mt-4"}`}>
        {box.madeAt ? (
          <TrustRow
            icon="🕐"
            label={t(locale, "freshMadeLabel")}
            value={formatMadeAt(box.madeAt, locale)}
          />
        ) : null}
        {storageLabel ? (
          <TrustRow icon="❄️" label={t(locale, "freshStorageLabel")} value={storageLabel} />
        ) : null}
        {box.bestBefore ? (
          <TrustRow
            icon="📅"
            label={t(locale, "freshBestBeforeLabel")}
            value={formatBestBefore(box.bestBefore, locale)}
          />
        ) : null}
        {box.freshnessNote ? (
          <TrustRow icon="✓" label={t(locale, "freshStorePromise")} value={box.freshnessNote} />
        ) : null}
      </div>

      <p className="mt-3 rounded-[12px] bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-giu-muted ring-1 ring-emerald-100/80">
        {t(locale, "freshTrustFooter")}
      </p>
    </section>
  );
}
