"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  bootstrapBoxAlerts,
  getFavoriteMerchantIds,
  getSeenBoxIds,
  markBoxesSeen,
} from "@/giu/lib/favorites";
import { t } from "@/giu/lib/i18n";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuBox } from "@/giu/lib/types";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";

type AlertItem = { boxId: string; title: string };

const POLL_MS = 45_000;

export function CustomerAvailabilityAlerts() {
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const [alert, setAlert] = useState<AlertItem | null>(null);

  const poll = useCallback(async () => {
    const favs = getFavoriteMerchantIds();
    if (favs.length === 0) return;

    try {
      const res = await fetch("/api/giu/boxes?openOnly=1", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { boxes: GiuBox[] };
      const boxes = (data.boxes ?? []).filter((b) => favs.includes(b.merchantId));
      const ids = boxes.map((b) => b.id);

      if (!bootstrapBoxAlerts(ids)) return;

      const seen = new Set(getSeenBoxIds());
      const fresh = boxes.filter((b) => !seen.has(b.id));
      if (fresh.length === 0) return;

      markBoxesSeen(fresh.map((b) => b.id));
      const first = fresh[0]!;
      setAlert({ boxId: first.id, title: first.title });

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(t(locale, "alertNewBox"), { body: first.title });
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore network */
    }
  }, [locale]);

  useEffect(() => {
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    const onFav = () => void poll();
    window.addEventListener("giu-favorites-changed", onFav);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("giu-favorites-changed", onFav);
    };
  }, [poll]);

  if (!alert) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-[440px] items-start gap-3 rounded-2xl bg-giu-ink px-4 py-3 text-sm text-white shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t(locale, "alertNewBox")}</p>
          <p className="mt-0.5 truncate text-white/80">{alert.title}</p>
        </div>
        <Link
          href={href(GIU_ROUTES.customer.box(alert.boxId))}
          className="shrink-0 rounded-xl bg-giu-primary px-3 py-1.5 text-xs font-bold"
          onClick={() => setAlert(null)}
        >
          {t(locale, "alertView")}
        </Link>
        <button
          type="button"
          className="shrink-0 text-xs text-white/60"
          onClick={() => setAlert(null)}
          aria-label="dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
