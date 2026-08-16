"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  formatPaymentStatusLocale,
  formatReservationStatusLocale,
} from "@/giu/lib/box-ux";
import { formatMoney, formatPickupWindow } from "@/giu/lib/format";
import { t } from "@/giu/lib/i18n";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuBox, GiuReservation } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";
import { MerchantOrderAlerts } from "./MerchantOrderAlerts";
import { MerchantPanelSkeleton } from "./MerchantPanelSkeleton";
import { MerchantPickupScanner } from "./MerchantPickupScanner";
import { MerchantProductList } from "./MerchantProductList";
import { MerchantPublishFlow } from "./MerchantPublishFlow";
import { MerchantReviewsClient } from "./MerchantReviewsClient";
import { MerchantSettingsForm } from "./MerchantSettingsForm";
import { MerchantSettlementSummary } from "./MerchantSettlementSummary";

const PAGE_SIZE = 50;

export function MerchantPanelClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab =
    tabParam === "orders" ? "orders" : tabParam === "settings" ? "settings" : "boxes";
  const { merchant, loading: authLoading } = useGiuAuth();
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const panelHref = href(GIU_ROUTES.merchant.panel);
  const market = "kr" as const;
  const money = (n: number) => formatMoney(n, market);
  const [boxes, setBoxes] = useState<GiuBox[]>([]);
  const [reservations, setReservations] = useState<GiuReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState<"awaiting" | "all">("awaiting");
  const [orderLimit, setOrderLimit] = useState(PAGE_SIZE);

  const load = useCallback(
    async (merchantId: string, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
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
        if (!bRes.ok || !rRes.ok) {
          setError(t(locale, "mLoadError"));
          return;
        }
        const bData = (await bRes.json()) as { boxes: GiuBox[] };
        const rData = (await rRes.json()) as { reservations: GiuReservation[] };
        setBoxes(bData.boxes ?? []);
        setReservations(rData.reservations ?? []);
      } catch {
        setError(t(locale, "mLoadError"));
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    if (merchant) void load(merchant.id);
    else if (!authLoading) setLoading(false);
  }, [merchant, authLoading, load]);

  const boxMap = useMemo(() => new Map(boxes.map((b) => [b.id, b])), [boxes]);

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
          r.customerPhone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
          (boxMap.get(r.boxId)?.title.toLowerCase().includes(q) ?? false),
      );
    }
    return list.sort((a, b) => {
      const aWait = a.status === "giu_cho" && a.paymentStatus === "paid" ? 0 : 1;
      const bWait = b.status === "giu_cho" && b.paymentStatus === "paid" ? 0 : 1;
      if (aWait !== bWait) return aWait - bWait;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [reservations, orderQuery, orderFilter, boxMap]);

  const visibleOrders = filteredOrders.slice(0, orderLimit);
  const hasMoreOrders = filteredOrders.length > orderLimit;

  const settlementHeld = reservations
    .filter((r) => r.settlementStatus === "held")
    .reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);
  const settlementReleased = reservations
    .filter((r) => r.settlementStatus === "released")
    .reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);

  const pendingAccountCount = reservations.filter((r) => r.payoutStatus === "pending_account").length;
  const needsBank = !merchant?.bankName?.trim() || !merchant?.bankAccount?.trim();

  if (authLoading || loading) {
    return <MerchantPanelSkeleton />;
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
          {!merchant.verified ? (
            <p className="mt-1 text-[11px] text-giu-muted">{t(locale, "mVerifiedHint")}</p>
          ) : null}
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

      {needsBank || pendingAccountCount > 0 ? (
        <div className="giu-info-banner space-y-2 text-[13px]">
          <p>{needsBank ? t(locale, "mOnboardingBank") : t(locale, "mPayoutPendingAccount")}</p>
          <Link href={`${panelHref}?tab=settings`} className="font-bold text-giu-accent underline">
            {t(locale, "mRegisterBankCta")}
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="giu-card space-y-2 text-center">
          <p className="text-sm text-giu-danger">{error}</p>
          <button type="button" className="giu-btn-secondary !py-2.5 text-[13px]" onClick={() => void load(merchant.id)}>
            {t(locale, "mRetryLoad")}
          </button>
        </div>
      ) : null}

      <MerchantOrderAlerts merchantId={merchant.id} onNewOrder={() => void load(merchant.id, { silent: true })} />

      {tab === "boxes" ? (
        <div key="boxes" className="giu-tab-panel space-y-4">
          <MerchantPublishFlow
            locale={locale}
            merchant={merchant}
            boxes={boxes}
            onPublished={() => load(merchant.id, { silent: true })}
          />
          <MerchantProductList
            locale={locale}
            boxes={boxes}
            onChanged={() => load(merchant.id, { silent: true })}
            onGoPublish={() => {
              document.getElementById("giu-publish-flow")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>
      ) : tab === "orders" ? (
        <section key="orders" className="giu-tab-panel space-y-3">
          <MerchantPickupScanner locale={locale} onVerified={() => void load(merchant.id, { silent: true })} />
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
                href={panelHref}
                className="giu-btn-primary mt-1 inline-flex !w-auto !px-5 !py-2.5 text-[13px]"
              >
                {t(locale, "mGoBoxes")}
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-2.5">
                {visibleOrders.map((r) => {
                  const box = boxMap.get(r.boxId);
                  const net = r.totalVnd - r.platformFeeVnd;
                  return (
                    <li key={r.id} className="giu-card-flat p-3 ring-1 ring-giu-border">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold text-giu-ink">{r.customerName}</p>
                          <p className="text-[13px] text-giu-muted">{r.customerPhone}</p>
                          {box ? (
                            <p className="mt-0.5 text-[12px] font-semibold text-giu-ink">
                              {t(locale, "mOrderProduct")}: {box.title}
                            </p>
                          ) : null}
                          {box ? (
                            <p className="text-[11px] text-giu-muted">
                              {formatPickupWindow(box.pickupStart, box.pickupEnd, market)}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[12px] text-giu-muted">
                            {t(locale, "mOrderCode")} {r.code} · {t(locale, "mOrderQty")} {r.quantity}
                            {t(locale, "mUnitQty")}
                          </p>
                          <p className="text-[12px] text-giu-muted">
                            {money(r.totalVnd)} · {t(locale, "mOrderFee")} {money(r.platformFeeVnd)} ·{" "}
                            {t(locale, "mOrderNet")} {money(net)}
                          </p>
                          <p className="text-[12px] text-giu-muted">
                            {formatPaymentStatusLocale(r.paymentStatus, locale)}{" "}
                            · {formatReservationStatusLocale(r.status, locale)}
                            {r.settlementStatus === "held"
                              ? ` · ${t(locale, "mSettleHeld")}`
                              : r.settlementStatus === "released"
                                ? ` · ${t(locale, "mSettleDone")}`
                                : ""}
                            {r.payoutStatus === "queued"
                              ? ` · ${t(locale, "mPayoutQueued")}`
                              : r.payoutStatus === "pending_account"
                                ? ` · ${t(locale, "mPayoutPendingAccount")}`
                                : r.payoutStatus === "sent"
                                  ? ` · ${t(locale, "mPayoutSent")}`
                                  : ""}
                          </p>
                        </div>
                        {r.status === "da_lay" ? (
                          <span className="rounded-full bg-giu-accent-soft px-2.5 py-1 text-[11px] font-bold text-giu-accent">
                            {t(locale, "mPickupDone")}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {hasMoreOrders ? (
                <button
                  type="button"
                  onClick={() => setOrderLimit((n) => n + PAGE_SIZE)}
                  className="giu-btn-secondary giu-btn-3d w-full !py-3 text-[13px]"
                >
                  {t(locale, "mLoadMore")}
                </button>
              ) : null}
            </>
          )}
        </section>
      ) : (
        <div key="settings" className="giu-tab-panel space-y-4">
          <MerchantSettlementSummary
            locale={locale}
            merchant={merchant}
            reservations={reservations}
            panelHref={panelHref}
          />
          <MerchantSettingsForm
            locale={locale}
            merchant={merchant}
            onSaved={() => void load(merchant.id, { silent: true })}
          />
          <MerchantReviewsClient locale={locale} merchantId={merchant.id} />
        </div>
      )}
    </div>
  );
}
