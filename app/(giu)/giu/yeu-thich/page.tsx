"use client";

import { FavoritesClient } from "@/giu/components/FavoritesClient";
import { EnableBoxAlertsButton } from "@/giu/components/EnableBoxAlertsButton";
import { t } from "@/giu/lib/i18n";
import { useGiuLocale } from "@/giu/components/GiuLocaleProvider";

export default function GiuFavoritesPage() {
  const { locale } = useGiuLocale();
  return (
    <div className="giu-page">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="giu-section-title">{t(locale, "favorites")}</h1>
          <p className="giu-section-sub">{t(locale, "favoritesEmptyHint")}</p>
        </div>
        <EnableBoxAlertsButton />
      </header>
      <FavoritesClient />
    </div>
  );
}
