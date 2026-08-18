"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  bootstrapOrderAlerts,
  getSeenOrderIds,
  markOrdersSeen,
} from "@/giu/lib/favorites";
import { formatMoney } from "@/giu/lib/format";
import { hapticConfirm } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import { playOrderAlertSound } from "@/giu/lib/order-alert-sound";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuReservation } from "@/giu/lib/types";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";

type Props = {
  merchantId: string;
  onNewOrder?: () => void;
};

type OrderToast = {
  reservationId: string;
  customerName: string;
  productTitle: string;
  quantity: number;
  totalVnd: number;
};

const POLL_FOREGROUND_MS = 8_000;
const POLL_BACKGROUND_MS = 25_000;

export function MerchantOrderAlerts({ merchantId, onNewOrder }: Props) {
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const [toast, setToast] = useState<OrderToast | null>(null);
  const [notifReady, setNotifReady] = useState(true);
  const [supportsNotif, setSupportsNotif] = useState(false);
  const knownRef = useRef(false);
  const boxMapRef = useRef<Map<string, string>>(new Map());

  const poll = useCallback(async () => {
    try {
      const [resRes, boxRes] = await Promise.all([
        fetch(`/api/giu/reservations?merchantId=${merchantId}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/giu/boxes?merchantId=${merchantId}`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (!resRes.ok) return;
      const data = (await resRes.json()) as { reservations: GiuReservation[] };
      if (boxRes.ok) {
        const boxes = ((await boxRes.json()) as { boxes?: { id: string; title: string }[] }).boxes ?? [];
        boxMapRef.current = new Map(boxes.map((b) => [b.id, b.title]));
      }

      const paid = (data.reservations ?? []).filter(
        (r) => r.paymentStatus === "paid" && r.status === "giu_cho",
      );
      const ids = paid.map((r) => r.id);

      if (!knownRef.current) {
        knownRef.current = true;
        if (!bootstrapOrderAlerts(ids, merchantId)) return;
      }

      const seen = new Set(getSeenOrderIds(merchantId));
      const fresh = paid.filter((r) => !seen.has(r.id));
      if (fresh.length === 0) return;

      markOrdersSeen(
        fresh.map((r) => r.id),
        merchantId,
      );
      const first = fresh[0]!;
      const productTitle = boxMapRef.current.get(first.boxId) ?? t(locale, "mOrderProduct");
      setToast({
        reservationId: first.id,
        customerName: first.customerName,
        productTitle,
        quantity: first.quantity,
        totalVnd: first.totalVnd,
      });
      onNewOrder?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("giu-merchant-new-order"));
      }
      hapticConfirm();
      playOrderAlertSound();

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(t(locale, "alertNewOrder"), {
            body: `${first.customerName} · ${productTitle}`,
            tag: `giu-order-${first.id}`,
            requireInteraction: true,
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
    let timer = window.setInterval(() => void poll(), POLL_FOREGROUND_MS);

    const onVisibility = () => {
      window.clearInterval(timer);
      const ms =
        typeof document !== "undefined" && document.visibilityState === "visible"
          ? POLL_FOREGROUND_MS
          : POLL_BACKGROUND_MS;
      timer = window.setInterval(() => void poll(), ms);
      if (document.visibilityState === "visible") void poll();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setSupportsNotif(true);
    setNotifReady(Notification.permission === "granted");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 12_000);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function enablePush() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifReady(perm === "granted");
  }

  const money = (n: number) => formatMoney(n, "kr");
  const ordersHref = `${href(GIU_ROUTES.merchant.panel)}?tab=orders`;

  return (
    <>
      {supportsNotif && !notifReady ? (
        <button
          type="button"
          onClick={() => void enablePush()}
          className="giu-btn-3d mb-3 w-full rounded-2xl bg-giu-primary/10 px-4 py-2.5 text-left text-xs font-semibold text-giu-primary ring-1 ring-giu-primary/20"
        >
          {t(locale, "enableOrderAlerts")}
        </button>
      ) : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-[95] flex justify-center px-4">
          <div className="giu-btn-3d flex max-w-[440px] items-center gap-3 rounded-2xl bg-giu-ink px-4 py-3 text-sm text-white shadow-lg">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t(locale, "alertNewOrder")}</p>
              <p className="font-semibold text-giu-gold">{toast.customerName}</p>
              <p className="mt-0.5 text-[11px] text-white/80">
                {toast.productTitle} · {toast.quantity}
                {t(locale, "mUnitQty")} · {money(toast.totalVnd)}
              </p>
            </div>
            <Link
              href={ordersHref}
              onClick={() => setToast(null)}
              className="giu-btn-3d shrink-0 rounded-xl bg-giu-gold px-3 py-2 text-[11px] font-bold text-giu-ink"
            >
              {t(locale, "alertViewOrders")}
            </Link>
            <button
              type="button"
              className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-white/90 hover:text-white"
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
