"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  bootstrapOrderAlerts,
  getSeenOrderIds,
  markOrdersSeen,
} from "@/giu/lib/favorites";
import { t } from "@/giu/lib/i18n";
import type { GiuReservation } from "@/giu/lib/types";
import { useGiuLocale } from "./GiuLocaleProvider";

type Props = {
  merchantId: string;
  onNewOrder?: () => void;
};

const POLL_MS = 20_000;

export function MerchantOrderAlerts({ merchantId, onNewOrder }: Props) {
  const { locale } = useGiuLocale();
  const [toast, setToast] = useState<{ code: string; name: string } | null>(null);
  const [notifReady, setNotifReady] = useState(true);
  const [supportsNotif, setSupportsNotif] = useState(false);
  const knownRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/giu/reservations?merchantId=${merchantId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { reservations: GiuReservation[] };
      const paid = (data.reservations ?? []).filter(
        (r) => r.paymentStatus === "paid" && r.status === "giu_cho",
      );
      const ids = paid.map((r) => r.id);

      if (!knownRef.current) {
        knownRef.current = true;
        if (!bootstrapOrderAlerts(ids)) return;
      }

      const seen = new Set(getSeenOrderIds());
      const fresh = paid.filter((r) => !seen.has(r.id));
      if (fresh.length === 0) return;

      markOrdersSeen(fresh.map((r) => r.id));
      const first = fresh[0]!;
      setToast({ code: first.code, name: first.customerName });
      onNewOrder?.();

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(t(locale, "alertNewOrder"), {
            body: `${first.code} · ${first.customerName}`,
          });
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  }, [merchantId, locale, onNewOrder]);

  useEffect(() => {
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setSupportsNotif(true);
    setNotifReady(Notification.permission === "granted");
  }, []);

  async function enablePush() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifReady(perm === "granted");
  }

  return (
    <>
      {supportsNotif && !notifReady ? (
        <button
          type="button"
          onClick={() => void enablePush()}
          className="w-full rounded-2xl bg-giu-primary/10 px-4 py-2.5 text-left text-xs font-semibold text-giu-primary ring-1 ring-giu-primary/20"
        >
          {t(locale, "enableOrderAlerts")}
        </button>
      ) : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-8">
          <div className="flex max-w-[440px] items-center gap-3 rounded-2xl bg-giu-ink px-4 py-3 text-sm text-white shadow-lg">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t(locale, "alertNewOrder")}</p>
              <p className="font-mono text-giu-gold">
                {toast.code} · {toast.name}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-xs text-white/60"
              aria-label={t(locale, "mCloseSheet")}
              onClick={() => setToast(null)}
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
