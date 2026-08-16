"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  formatPaymentStatusLocale,
  formatReservationStatusLocale,
} from "@/giu/lib/box-ux";
import { formatMoney } from "@/giu/lib/format";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuBox, GiuReservation } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";
import { MerchantOrderAlerts } from "./MerchantOrderAlerts";
import { MerchantPickupScanner } from "./MerchantPickupScanner";
import { MerchantProductList } from "./MerchantProductList";
import { MerchantPublishFlow } from "./MerchantPublishFlow";
import { MerchantSettingsForm } from "./MerchantSettingsForm";

export function MerchantPanelClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab =
    tabParam === "orders" ? "orders" : tabParam === "settings" ? "settings" : "boxes";
  const { merchant, loading: authLoading } = useGiuAuth();
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const market = "kr" as const;
  const money = (n: number) => formatMoney(n, market);
  const [boxes, setBoxes] = useState<GiuBox[]>([]);
  const [reservations, setReservations] = useState<GiuReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState<"awaiting" | "all">("awaiting");
  const [confirmPickupId, setConfirmPickupId] = useState<string | null>(null);

  const load = useCallback(
    async (merchantId: string) => {
      setLoading(true);
      setError("");
      try {
        const [bRes, rRes] = await Promise.all([
          fetch(`/api/giu/boxes?merchantId=${merchantId}`, { credentials: "include" }),
          fetch(`/api/giu/reservations?merchantId=${merchantId}`, { credentials: "include" }),
        ]);
        if (bRes.status === 401 || rRes.status === 401) {
          setError(t(locale, "mSessionExpired"));
          return;
        }
        const bData = (await bRes.json()) as { boxes: GiuBox[] };
        const rData = (await rRes.json()) as { reservations: GiuReservation[] };
        setBoxes(bData.boxes ?? []);
        setReservations(rData.reservations ?? []);
      } catch {
        setError(t(locale, "mLoadError"));
      } finally {
        setLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    if (merchant) void load(merchant.id);
    else if (!authLoading) setLoading(false);
  }, [merchant, authLoading, load]);

  const openBoxes = useMemo(
    () => boxes.filter((b) => b.status === "mo" && b.quantityLeft > 0).length,
    [boxes],
  );
  const awaitingPickup = useMemo(
    () =>
      reservations.filter((r) => r.paymentStatus === "paid" && r.status === "giu_cho").length,
    [reservations],
  );

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    let list = reservations.filter(
      (r) => r.paymentStatus === "paid" || r.paymentStatus === "refunded",
    );
    if (orderFilter === "awaiting") {
      list = list.filter((r) => r.status === "giu_cho" && r.paymentStatus === "paid");
    }
    if (q) {
      list = list.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
      );
    }
    return list.sort((a, b) => {
      const aWait = a.status === "giu_cho" && a.paymentStatus === "paid" ? 0 : 1;
      const bWait = b.status === "giu_cho" && b.paymentStatus === "paid" ? 0 : 1;
      if (aWait !== bWait) return aWait - bWait;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [reservations, orderQuery, orderFilter]);

  const settlementHeld = reservations
    .filter((r) => r.settlementStatus === "held")
    .reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);
  const settlementReleased = reservations
    .filter((r) => r.settlementStatus === "released")
    .reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);

  async function markPickedUp(reservationId: string) {
    hapticConfirm();
    await fetch(`/api/giu/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "da_lay" }),
    });
    setConfirmPickupId(null);
    if (merchant) await load(merchant.id);
  }

  if (authLoading || loading) {
    return <p className="text-giu-muted">{t(locale, "loading")}</p>;
  }

  if (!merchant) {
    return (
      <div className="giu-card space-y-3 text-center">
        <p className="font-bold text-giu-ink">{t(locale, "mLoadError")}</p>
        <p className="text-[13px] text-giu-muted">{t(locale, "mSessionExpired")}</p>
        <button
          type="button"
          className="giu-btn-primary"
          onClick={() => {
            window.location.href = `${href(GIU_ROUTES.auth)}?role=merchant`;
          }}
        >
          {t(locale, "loginSignup")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="giu-card space-y-3">
        <div>
          <h1 className="text-[20px] font-extrabold tracking-tight">{merchant.name}</h1>
          <p className="mt-0.5 text-[12px] text-giu-muted">{merchant.address}</p>
          <p className="mt-2 text-[12px]">
            {t(locale, "mRescued")} <strong>{merchant.rescuedBoxes}</strong>
            {merchant.verified ? (
              <span className="ml-2 rounded-md bg-giu-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-giu-accent">
                {t(locale, "mVerified")}
              </span>
            ) : (
              <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                {t(locale, "mUnverified")}
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
          <div className="rounded-[12px] bg-giu-accent-soft px-3 py-2">
            <p className="text-[10px] font-medium text-giu-accent">{t(locale, "mOpenBoxes")}</p>
            <p className="font-extrabold text-giu-ink">{openBoxes}</p>
          </div>
          <div className="rounded-[12px] bg-giu-accent-soft px-3 py-2">
            <p className="text-[10px] font-medium text-giu-accent">{t(locale, "mAwaitingPickup")}</p>
            <p className="font-extrabold text-giu-ink">{awaitingPickup}</p>
          </div>
          <div className="rounded-[12px] bg-giu-bg px-3 py-2">
            <p className="text-[10px] font-medium text-giu-muted">{t(locale, "mSettleHeld")}</p>
            <p className="font-extrabold text-giu-ink">{money(settlementHeld)}</p>
          </div>
          <div className="rounded-[12px] bg-giu-bg px-3 py-2">
            <p className="text-[10px] font-medium text-giu-muted">{t(locale, "mSettleDone")}</p>
            <p className="font-extrabold text-giu-ink">{money(settlementReleased)}</p>
          </div>
        </div>
        <p className="text-[11px] text-giu-muted">{t(locale, "mFeeNote")}</p>
      </div>

      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
      <MerchantOrderAlerts merchantId={merchant.id} onNewOrder={() => void load(merchant.id)} />

      {tab === "boxes" ? (
        <div key="boxes" className="giu-tab-panel space-y-4">
          <MerchantPublishFlow
            locale={locale}
            merchant={merchant}
            boxes={boxes}
            onPublished={() => load(merchant.id)}
          />

          <MerchantProductList
            locale={locale}
            boxes={boxes}
            onChanged={() => load(merchant.id)}
          />
        </div>
      ) : tab === "orders" ? (
        <section key="orders" className="giu-tab-panel space-y-3">
          <MerchantPickupScanner locale={locale} onVerified={() => void load(merchant.id)} />
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">
              {t(locale, "mOrders")} ({filteredOrders.length})
            </h2>
            <div className="flex rounded-full bg-giu-bg p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setOrderFilter("awaiting")}
                className={`rounded-full px-3 py-1.5 ${
                  orderFilter === "awaiting" ? "bg-white text-giu-ink shadow-sm" : "text-giu-muted"
                }`}
              >
                {t(locale, "mOrdersAwaiting")}
              </button>
              <button
                type="button"
                onClick={() => setOrderFilter("all")}
                className={`rounded-full px-3 py-1.5 ${
                  orderFilter === "all" ? "bg-white text-giu-ink shadow-sm" : "text-giu-muted"
                }`}
              >
                {t(locale, "mOrdersAll")}
              </button>
            </div>
          </div>
          <input
            value={orderQuery}
            onChange={(e) => setOrderQuery(e.target.value)}
            placeholder={t(locale, "mOrderSearch")}
            className="giu-input"
          />
          {filteredOrders.length === 0 ? (
            <div className="giu-card space-y-2 text-center">
              <p className="font-bold text-giu-ink">{t(locale, "mNoOrders")}</p>
              <p className="text-[13px] text-giu-muted">{t(locale, "mNoOrdersHint")}</p>
              <Link
                href={href(GIU_ROUTES.merchant.panel)}
                className="giu-btn-primary mt-1 inline-flex !w-auto !px-5 !py-2.5 text-[13px]"
              >
                {t(locale, "mGoBoxes")}
              </Link>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {filteredOrders.slice(0, 50).map((r) => (
                <li key={r.id} className="giu-card-flat p-3 ring-1 ring-giu-border">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-lg font-extrabold text-giu-accent">{r.code}</p>
                      <p className="text-[13px]">
                        {r.customerName} · {r.customerPhone}
                      </p>
                      <p className="text-[12px] text-giu-muted">
                        {t(locale, "mOrderQty")} {r.quantity}개 · {money(r.totalVnd)} ·{" "}
                        {formatPaymentStatusLocale(r.paymentStatus, locale)}{" "}
                        · {formatReservationStatusLocale(r.status, locale)}
                        {r.settlementStatus === "held"
                          ? ` · ${t(locale, "mSettleHeld")}`
                          : r.settlementStatus === "released"
                            ? ` · ${t(locale, "mSettleDone")}`
                            : ""}
                      </p>
                      {confirmPickupId === r.id ? (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-[12px] font-medium text-giu-ink">
                            {t(locale, "mPickupConfirm")}
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void markPickedUp(r.id)}
                              className="giu-btn-primary giu-btn-3d !w-auto !px-4 !py-2 text-[13px]"
                            >
                              {t(locale, "mPickupYes")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmPickupId(null)}
                              className="giu-btn-secondary giu-btn-3d !w-auto !px-4 !py-2 text-[13px]"
                            >
                              {t(locale, "mPickupNo")}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {r.status === "giu_cho" &&
                    r.paymentStatus === "paid" &&
                    confirmPickupId !== r.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          hapticSelect();
                          setConfirmPickupId(r.id);
                        }}
                        className="giu-btn-primary giu-btn-3d !w-auto !px-4 !py-2 text-[13px]"
                      >
                        {t(locale, "mPickupDone")}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div key="settings" className="giu-tab-panel">
          <MerchantSettingsForm
          locale={locale}
          merchant={merchant}
          onSaved={() => void load(merchant.id)}
        />
        </div>
      )}
    </div>
  );
}
