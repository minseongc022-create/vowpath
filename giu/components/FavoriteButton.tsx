"use client";

import { useEffect, useState } from "react";
import { isFavoriteMerchant, toggleFavoriteMerchant } from "@/giu/lib/favorites";
import { useGiuLocale } from "./GiuLocaleProvider";
import { t } from "@/giu/lib/i18n";

type Props = {
  merchantId: string;
  merchantName?: string;
  className?: string;
};

export function FavoriteButton({ merchantId, merchantName, className = "" }: Props) {
  const { locale } = useGiuLocale();
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(isFavoriteMerchant(merchantId));
  }, [merchantId]);

  function toggle() {
    const next = toggleFavoriteMerchant(merchantId);
    setOn(next);
    window.dispatchEvent(new CustomEvent("giu-favorites-changed"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? t(locale, "unfavorite") : t(locale, "favorite")}
      title={merchantName}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
        on
          ? "bg-giu-primary/10 text-giu-primary ring-giu-primary/30"
          : "bg-giu-bg text-giu-muted ring-giu-border hover:text-giu-ink"
      } ${className}`}
    >
      <span aria-hidden>{on ? "♥" : "♡"}</span>
      {on ? t(locale, "favorited") : t(locale, "favorite")}
    </button>
  );
}
