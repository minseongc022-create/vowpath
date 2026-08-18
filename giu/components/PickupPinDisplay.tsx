"use client";

import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  code: string;
};

export function PickupPinDisplay({ locale, code }: Props) {
  const digits = code.replace(/\D/g, "").slice(0, 3).padStart(3, "0");

  return (
    <div className="space-y-2 rounded-[16px] bg-giu-bg/80 p-4 ring-1 ring-giu-border">
      <p className="text-[12px] font-bold text-giu-ink">{t(locale, "pickupPinTitle")}</p>
      <p className="text-[11px] leading-snug text-giu-muted">{t(locale, "pickupPinHint")}</p>
      <p
        className="text-center font-mono text-[36px] font-extrabold tracking-[0.35em] text-giu-ink"
        aria-label={t(locale, "pickupPinTitle")}
      >
        {digits.split("").join(" ")}
      </p>
    </div>
  );
}
