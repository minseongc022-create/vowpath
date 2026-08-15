"use client";

import { MyReservationsLookup } from "@/giu/components/MyReservationsLookup";
import { t } from "@/giu/lib/i18n";
import { useGiuLocale } from "@/giu/components/GiuLocaleProvider";

export default function GiuMyCodesPage() {
  const { locale } = useGiuLocale();
  return (
    <div className="giu-page space-y-4">
      <header>
        <h1 className="giu-section-title">{t(locale, "myCodes")}</h1>
        <p className="giu-section-sub">{t(locale, "myCodesSub")}</p>
      </header>
      <MyReservationsLookup />
    </div>
  );
}
