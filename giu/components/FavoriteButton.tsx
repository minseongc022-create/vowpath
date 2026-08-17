"use client";

import { useEffect, useState } from "react";
import { isFavoriteMerchant, toggleFavoriteMerchant, toggleFavoriteRemote } from "@/giu/lib/favorites";
import { hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";

type Props = {
  merchantId: string;
  merchantName?: string;
  className?: string;
};

export function FavoriteButton({ merchantId, merchantName, className = "" }: Props) {
  const { locale } = useGiuLocale();
  const { account } = useGiuAuth();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOn(isFavoriteMerchant(merchantId));
  }, [merchantId]);

  async function toggle() {
    if (busy) return;
    hapticSelect();
    setBusy(true);
    try {
      const next = account ? await toggleFavoriteRemote(merchantId) : toggleFavoriteMerchant(merchantId);
      setOn(next);
      window.dispatchEvent(new CustomEvent("giu-favorites-changed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? t(locale, "unfavorite") : t(locale, "favorite")}
      title={merchantName}
      className={`giu-btn-3d giu-tap inline-flex h-9 items-center gap-1 rounded-full px-3 text-[12px] font-bold transition ${
        on
          ? "bg-giu-accent text-white"
          : "bg-white text-giu-muted ring-1 ring-giu-border"
      } ${className}`}
    >
      <span aria-hidden>{on ? "♥" : "♡"}</span>
      {on ? t(locale, "favorited") : t(locale, "favorite")}
    </button>
  );
}
