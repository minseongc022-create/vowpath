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
      className={`inline-flex h-9 items-center gap-1 rounded-full px-3 text-[12px] font-bold transition ${
        on
          ? "bg-giu-primary text-white"
          : "bg-white/80 text-giu-muted ring-1 ring-giu-border"
      } ${className}`}
    >
      <span aria-hidden>{on ? "♥" : "♡"}</span>
      {on ? t(locale, "favorited") : t(locale, "favorite")}
    </button>
  );
}
