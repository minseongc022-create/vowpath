"use client";

import { t, type GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  /** panel = compact under dashboard; auth = signup/login pitch */
  variant?: "panel" | "auth" | "landing";
};

export function MerchantValuePitch({ locale, variant = "panel" }: Props) {
  const points = [
    t(locale, "mValueProp1"),
    t(locale, "mValueProp2"),
    t(locale, "mValueProp3"),
  ] as const;

  if (variant === "auth") {
    return (
      <div className="giu-info-banner space-y-2 text-[12px] leading-relaxed">
        <p className="font-bold text-giu-ink">{t(locale, "mAuthMerchantSub")}</p>
        <ul className="space-y-1 text-giu-muted">
          {points.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
        <p className="text-[11px] font-semibold text-giu-primary">{t(locale, "mFeeNote")}</p>
      </div>
    );
  }

  if (variant === "landing") {
    return (
      <div className="giu-card space-y-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-giu-ink">{t(locale, "mLandingTitle")}</h2>
          <p className="mt-1 text-[13px] font-semibold text-giu-muted">{t(locale, "mAuthMerchantSub")}</p>
        </div>
        <ul className="space-y-2 text-[13px] text-giu-ink">
          {points.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="font-bold text-giu-primary">✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="rounded-[12px] bg-giu-primary-soft px-3 py-2 text-[12px] font-bold text-giu-primary">
          {t(locale, "mFeeNote")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] bg-giu-bg/80 px-3 py-2.5 ring-1 ring-giu-border">
      <p className="text-[11px] font-bold leading-snug text-giu-ink">{t(locale, "mFeeNote")}</p>
      <ul className="mt-1.5 space-y-0.5 text-[11px] text-giu-muted">
        {points.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>
    </div>
  );
}
