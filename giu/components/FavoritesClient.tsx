"use client";

import { useCallback, useEffect, useState } from "react";
import { BoxCard } from "@/giu/components/BoxCard";
import { FavoriteButton } from "@/giu/components/FavoriteButton";
import { getFavoriteMerchantIds } from "@/giu/lib/favorites";
import { getDistrictLabel } from "@/giu/lib/districts";
import { getCategoryEmoji, getCategoryLabel } from "@/giu/lib/categories";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuBox, GiuMerchant } from "@/giu/lib/types";
import Link from "next/link";
import { useGiuLocale } from "./GiuLocaleProvider";
import { t } from "@/giu/lib/i18n";

export function FavoritesClient() {
  const { locale } = useGiuLocale();
  const [merchantIds, setMerchantIds] = useState<string[]>([]);
  const [merchants, setMerchants] = useState<GiuMerchant[]>([]);
  const [boxes, setBoxes] = useState<GiuBox[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshIds = useCallback(() => {
    setMerchantIds(getFavoriteMerchantIds());
  }, []);

  useEffect(() => {
    refreshIds();
    const onFav = () => refreshIds();
    window.addEventListener("giu-favorites-changed", onFav);
    window.addEventListener("storage", onFav);
    return () => {
      window.removeEventListener("giu-favorites-changed", onFav);
      window.removeEventListener("storage", onFav);
    };
  }, [refreshIds]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [mRes, bRes] = await Promise.all([
          fetch("/api/giu/merchants", { cache: "no-store" }),
          fetch("/api/giu/boxes?openOnly=1", { cache: "no-store" }),
        ]);
        const mData = (await mRes.json()) as { merchants: GiuMerchant[] };
        const bData = (await bRes.json()) as { boxes: GiuBox[] };
        if (cancelled) return;
        setMerchants(mData.merchants ?? []);
        setBoxes(bData.boxes ?? []);
      } catch {
        if (!cancelled) {
          setMerchants([]);
          setBoxes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [merchantIds]);

  const favMerchants = merchants.filter((m) => merchantIds.includes(m.id));
  const favBoxes = boxes.filter((b) => merchantIds.includes(b.merchantId));
  const merchantMap = new Map(merchants.map((m) => [m.id, m]));

  if (loading && merchantIds.length === 0) {
    return <p className="text-sm text-giu-muted">{t(locale, "loading")}</p>;
  }

  if (merchantIds.length === 0) {
    return (
      <div className="giu-card text-center">
        <p className="font-semibold text-giu-ink">{t(locale, "favoritesEmpty")}</p>
        <p className="mt-2 text-sm text-giu-muted">{t(locale, "favoritesEmptyHint")}</p>
        <Link href={GIU_ROUTES.customer.boxes} className="giu-btn-primary mt-4 block">
          {t(locale, "findBoxes")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-semibold text-giu-ink">
          {t(locale, "favoriteStores")} ({favMerchants.length})
        </h2>
        <ul className="mt-3 space-y-3">
          {favMerchants.map((m) => (
            <li key={m.id} className="giu-card-flat flex items-start gap-3 p-4 ring-1 ring-giu-border">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-giu-bg text-xl">
                {getCategoryEmoji(m.category)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-giu-ink">{m.name}</p>
                <p className="text-xs text-giu-muted">
                  {getCategoryLabel(m.category)} · {getDistrictLabel(m.district)}
                </p>
                <p className="mt-1 truncate text-xs text-giu-muted">{m.address}</p>
                <div className="mt-2">
                  <FavoriteButton merchantId={m.id} merchantName={m.name} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-giu-ink">
          {t(locale, "openFromFavorites")} ({favBoxes.length})
        </h2>
        {favBoxes.length === 0 ? (
          <p className="mt-3 text-sm text-giu-muted">{t(locale, "noOpenFromFavorites")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {favBoxes.map((box) => {
              const merchant = merchantMap.get(box.merchantId);
              if (!merchant) return null;
              return <BoxCard key={box.id} box={box} merchant={merchant} />;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
