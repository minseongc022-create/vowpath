"use client";

import { useEffect, useState } from "react";
import { t } from "@/giu/lib/i18n";
import { useGiuLocale } from "./GiuLocaleProvider";

export function EnableBoxAlertsButton() {
  const { locale } = useGiuLocale();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
  }, []);

  if (perm === "unsupported" || perm === "granted") return null;

  return (
    <button
      type="button"
      className="giu-btn-3d giu-tap shrink-0 rounded-full bg-giu-ink px-3 py-2 text-[10px] font-bold text-white"
      onClick={async () => {
        try {
          const next = await Notification.requestPermission();
          setPerm(next);
        } catch {
          /* ignore */
        }
      }}
    >
      {t(locale, "enableBoxAlerts")}
    </button>
  );
}
