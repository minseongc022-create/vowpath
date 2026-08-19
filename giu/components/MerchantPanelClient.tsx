"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  formatPaymentStatusLocale,
  formatReservationStatusLocale,
} from "@/giu/lib/box-ux";
import { formatMoney, formatPickupWindowWithDate } from "@/giu/lib/format";
import { hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuBox, GiuReservation } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";
import { MerchantBankRegisterSheet } from "./MerchantBankRegisterSheet";
import { MerchantCustomerDetailSheet } from "./MerchantCustomerDetailSheet";
import { MerchantCustomerInsights } from "./MerchantCustomerInsights";
import { MerchantLogoutLink } from "./MerchantLogoutLink";
import { MerchantPanelSkeleton } from "./MerchantPanelSkeleton";
import { ReservationChatButton } from "./ReservationChatButton";
import { useMerchantPickup } from "./MerchantPickupProvider";
import { MerchantProductList } from "./MerchantProductList";
import { MerchantPublishFlow } from "./MerchantPublishFlow";
import { MerchantReviewsClient } from "./MerchantReviewsClient";
import { MerchantSettlementSummary } from "./MerchantSettlementSummary";
import { MerchantSettingsForm } from "./MerchantSettingsForm";
import { MerchantStatsSheet, type MerchantStatFilter } from "./MerchantStatsSheet";
import { MerchantExtensionReview } from "./MerchantExtensionReview";
import { MerchantNoShowButton } from "./MerchantNoShowButton";
import { MerchantOrderStatusBadge } from "./MerchantOrderStatusBadge";
import {
  merchantCanMarkNoShow,
  resolveDisplayReservationStatus,
  resolvePickupPolicy,
} from "@/giu/lib/pickup-policy";

const PAGE_SIZE = 50;
const MERCHANT_TABS = ["boxes", "orders", "settings"] as const;
type MerchantTab = (typeof MERCHANT_TABS)[number];
type OrderFilter = "awaiting" | "expired" | "all";

export function MerchantPanelClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const highlightOrderId = searchParams.get("order");
  const tab: MerchantTab =
    tabParam === "orders" ? "orders" : tabParam === "settings" ? "settings" : "boxes";
  const { merchant, account, loading: authLoading, refresh, logout } = useGiuAuth();
  const { locale } = useGiuLocale();
  const { registerOnVerified } = useMerchantPickup();
  const href = useGiuHref();
  const panelHref = href(GIU_ROUTES.merchant.panel);
  const market = "kr" as const;
  const money = (n: number) => formatMoney(n, market);
  const [boxes, setBoxes] = useState<GiuBox[]>([]);
  const [reservations, setReservations] = useState<GiuReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("awaiting");
  const [orderLimit, setOrderLimit] = useState(PAGE_SIZE);
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [statFilter, setStatFilter] = useState<MerchantStatFilter | null>(null);
  const [customerDetailId, setCustomerDetailId] = useState<string | null>(null);
  const [tabSlide, setTabSlide] = useState<"forward" | "back">("forward");
  const prevTabIndex = useRef(MERCHANT_TABS.indexOf(tab));

  const tabIndex = MERCHANT_TABS.indexOf(tab);

  useEffect(() => {
    const prev = prevTabIndex.current;
    const next = tabIndex;
    if (next > prev) setTabSlide("forward");
    else if (next < prev) setTabSlide("back");
    prevTabIndex.current = next;
  }, [tabIndex]);

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
          await logout();
          window.location.href = `${href(GIU_ROUTES.auth)}?role=merchant`;
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
    [locale, logout, href],
  );

  useEffect(() => {
    if (merchant) void load(merchant.id);
    else if (!authLoading) setLoading(false);
  }, [merchant, authLoading, load]);

  useEffect(() => {
    if (!merchant) return;
    return registerOnVerified(() => {
      void load(merchant.id, { silent: true });
      void refresh();
    });
  }, [merchant, load, registerOnVerified, refresh]);

  useEffect(() => {
    if (!merchant) return;
    const onNew = () => void load(merchant.id, { silent: true });
    window.addEventListener("giu-merchant-new-order", onNew);
    return () => window.removeEventListener("giu-merchant-new-order", onNew);
  }, [merchant, load]);

  useEffect(() => {
    if (!highlightOrderId || tab !== "orders") return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`giu-order-${highlightOrderId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [highlightOrderId, tab, loading]);

  const boxMap = useMemo(() => new Map(boxes.map((b) => [b.id, b])), [boxes]);

  const openBoxes = useMemo(
    () => boxes.filter((b) => b.status === "mo" && b.quantityLeft > 0).length,
    [boxes],
  );
  const pickupPolicy = useMemo(
    () => (merchant ? resolvePickupPolicy(merchant) : resolvePickupPolicy()),
    [merchant],
  );

  const reservationDisplayStatus = useCallback(
    (r: GiuReservation) => {
      const box = boxMap.get(r.boxId);
      return resolveDisplayReservationStatus(r, box?.pickupEnd, pickupPolicy);
    },
    [boxMap, pickupPolicy],
  );

  const awaitingPickup = useMemo(
    () =>
      reservations.filter(
        (r) => r.paymentStatus === "paid" && reservationDisplayStatus(r) === "giu_cho",
      ).length,
    [reservations, reservationDisplayStatus],
  );

  const expiredPickup = useMemo(
    () =>
      reservations.filter(
        (r) => r.paymentStatus === "paid" && reservationDisplayStatus(r) === "het_han",
      ).length,
    [reservations, reservationDisplayStatus],
  );

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    let list = reservations.filter(
      (r) => r.paymentStatus === "paid" || r.paymentStatus === "refunded",
    );
    if (orderFilter === "awaiting") {
      list = list.filter(
        (r) => r.paymentStatus === "paid" && reservationDisplayStatus(r) === "giu_cho",
      );
    } else if (orderFilter === "expired") {
      list = list.filter(
        (r) => r.paymentStatus === "paid" && reservationDisplayStatus(r) === "het_han",
      );
    }
    if (q) {
      list = list.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
          (boxMap.get(r.boxId)?.title.toLowerCase().includes(q) ?? false),
      );
    }
    return list.sort((a, b) => {
      const rank = (r: GiuReservation) => {
        const s = reservationDisplayStatus(r);
        if (s === "het_han") return 0;
        if (s === "giu_cho" && r.paymentStatus === "paid") return 1;
        return 2;
      };
      const aWait = rank(a);
      const bWait = rank(b);
      if (aWait !== bWait) return aWait - bWait;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [reservations, orderQuery, orderFilter, boxMap, reservationDisplayStatus]);

  const visibleOrders = filteredOrders.slice(0, orderLimit);
  const hasMoreOrders = filteredOrders.length > orderLimit;

  const settlementHeld = reservations
    .filter(
      (r) =>
        r.paymentStatus === "paid" &&
        r.settlementStatus === "held" &&
        (r.status === "giu_cho" || r.status === "het_han"),
    )
    .reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);
  const settlementReleased = reservations
    .filter((r) => r.paymentStatus === "paid" && r.settlementStatus === "released" && r.status === "da_lay")
    .reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);

  const pendingAccountCount = reservations.filter((r) => r.payoutStatus === "pending_account").length;
  const needsBank = !merchant?.bankName?.trim() || !merchant?.bankAccount?.trim();
  const pickupDoneCount = reservations.filter((r) => r.status === "da_lay").length;

  const openStatSheet = (filter: MerchantStatFilter) => {
    hapticSelect();
    setStatFilter(filter);
  };

  if (authLoading || loading) {
    return <MerchantPanelSkeleton />;
  }

  if (!merchant) {
    const detail =
      account?.role === "merchant" ? t(locale, "mStoreNotFound") : t(locale, "mSessionExpired");
    return (
      <div className="giu-card space-y-3 text-center">
        <p className="font-bold text-giu-ink">{t(locale, "mLoadError")}</p>
        <p className="text-[13px] font-semibold text-giu-muted">{detail}</p>
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
            <button
              type="button"
              onClick={() => openStatSheet("pickupDone")}
              className="giu-tap rounded-md px-0.5 font-semibold text-giu-ink underline decoration-giu-primary/30 underline-offset-2"
            >
              {t(locale, "mRescued")} <strong>{pickupDoneCount || merchant.rescuedBoxes}</strong>
            </button>
            {merchant.verified ? (
              <span className="ml-2 rounded-md bg-giu-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-giu-primary">
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
          {(
            [
              { key: "selling" as const, label: t(locale, "mOpenBoxes"), value: String(openBoxes) },
              {
                key: "awaiting" as const,
                label: t(locale, "mAwaitingPickup"),
                value: String(awaitingPickup),
              },
              {
                key: "settleHeld" as const,
                label: t(locale, "mSettleHeld"),
                value: money(settlementHeld),
              },
              {
                key: "settleDone" as const,
                label: t(locale, "mSettleDone"),
                value: money(settlementReleased),
              },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => openStatSheet(item.key)}
              className={`giu-tap rounded-[12px] px-3 py-2 text-left transition active:scale-[0.98] ${
                item.key === "settleHeld" || item.key === "settleDone"
                  ? "bg-giu-bg ring-1 ring-giu-border"
                  : "bg-giu-primary-soft ring-1 ring-giu-primary/10"
              }`}
            >
              <p
                className={`text-[10px] font-bold ${
                  item.key === "settleHeld" || item.key === "settleDone"
                    ? "text-giu-muted"
                    : "text-giu-primary"
                }`}
              >
                {item.label}
              </p>
              <p className="font-extrabold text-giu-ink">{item.value}</p>
            </button>
          ))}
        </div>
        <p className="text-[11px] font-semibold text-giu-muted">{t(locale, "mFeeNote")}</p>
        <ul className="mt-2 space-y-1 text-[11px] leading-snug text-giu-muted">
          <li>· {t(locale, "mValueProp1")}</li>
          <li>· {t(locale, "mValueProp2")}</li>
          <li>· {t(locale, "mValueProp3")}</li>
        </ul>
      </div>

      {needsBank || pendingAccountCount > 0 ? (
        <div className="giu-info-banner space-y-2 text-[13px]">
          <p>{needsBank ? t(locale, "mOnboardingBank") : t(locale, "mPayoutPendingAccount")}</p>
          <button
            type="button"
            onClick={() => setBankSheetOpen(true)}
            className="giu-btn-primary giu-btn-3d w-full !py-3 text-[14px]"
          >
            {t(locale, "mRegisterBankCta")}
          </button>
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

      <div className="giu-tab-stage">
        {tab === "boxes" ? (
          <div
            key="boxes"
            className={`giu-tab-panel-3d space-y-4 ${tabSlide === "forward" ? "is-forward" : "is-back"}`}
          >
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
          <section
            key="orders"
            className={`giu-tab-panel-3d space-y-3 ${tabSlide === "forward" ? "is-forward" : "is-back"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">
                {t(locale, "mOrders")} ({filteredOrders.length})
              </h2>
            </div>
            <div className="giu-filter-tabs">
              {(["awaiting", "expired", "all"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    hapticSelect();
                    setOrderFilter(f);
                  }}
                  className={`giu-filter-tab ${orderFilter === f ? "is-active" : ""}`}
                >
                  {f === "awaiting"
                    ? `${t(locale, "mOrdersAwaiting")}${awaitingPickup > 0 ? ` (${awaitingPickup})` : ""}`
                    : f === "expired"
                      ? `${t(locale, "mFilterExpired")}${expiredPickup > 0 ? ` (${expiredPickup})` : ""}`
                      : t(locale, "mOrdersAll")}
                </button>
              ))}
            </div>
          <input
            value={orderQuery}
            onChange={(e) => setOrderQuery(e.target.value)}
            placeholder={t(locale, "mOrderSearch")}
            className="giu-input"
          />
          {filteredOrders.length === 0 ? (
            <div className="giu-card space-y-3 text-center">
              <p className="font-bold text-giu-ink">
                {orderFilter === "awaiting"
                  ? t(locale, "mNoOrders")
                  : orderFilter === "expired"
                    ? t(locale, "mStatEmptyExpired")
                    : t(locale, "mNoOrdersAll")}
              </p>
              <p className="text-[13px] text-giu-muted">
                {orderFilter === "awaiting"
                  ? t(locale, "mNoOrdersHint")
                  : orderFilter === "expired"
                    ? t(locale, "mStatSettleHeldHint")
                    : t(locale, "mNoOrdersAllHint")}
              </p>
              <Link href={panelHref} className="giu-btn-primary giu-btn-3d block !py-3 text-[14px]">
                {t(locale, "mGoBoxes")}
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-2.5">
                {visibleOrders.map((r) => {
                  const box = boxMap.get(r.boxId);
                  const net = r.totalVnd - r.platformFeeVnd;
                  const shown = reservationDisplayStatus(r);
                  const isActiveAwaiting = shown === "giu_cho" && r.paymentStatus === "paid";
                  const isExpired = shown === "het_han";
                  return (
                    <li
                      key={r.id}
                      id={`giu-order-${r.id}`}
                      className={`giu-card-flat p-3 ring-1 ${
                        highlightOrderId === r.id ? "ring-2 ring-giu-primary" : "ring-giu-border"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => {
                              hapticSelect();
                              setCustomerDetailId(r.customerId);
                            }}
                            className="w-full rounded-[12px] text-left ring-1 ring-transparent transition active:bg-giu-bg/80 active:ring-giu-border/60"
                          >
                            <p className="text-[15px] font-bold text-giu-ink">{r.customerName}</p>
                            <p className="text-[13px] text-giu-muted">{r.customerPhone}</p>
                            <p className="mt-1 text-[10px] font-semibold text-giu-primary">
                              {t(locale, "mCustDetailTap")}
                            </p>
                          </button>
                          {box ? (
                            <p className="mt-2 text-[12px] font-semibold text-giu-ink">
                              {t(locale, "mOrderProduct")}: {box.title}
                            </p>
                          ) : null}
                          {box ? (
                            <p className="text-[11px] font-medium text-giu-muted">
                              {formatPickupWindowWithDate(box.pickupStart, box.pickupEnd, market)}
                            </p>
                          ) : null}
                          {isActiveAwaiting ? (
                            <p className="mt-2 rounded-[14px] bg-giu-primary-soft px-3 py-2.5 text-[11px] font-semibold leading-snug text-giu-muted ring-1 ring-giu-primary/15">
                              {t(locale, "mAwaitingPickupHint")}
                            </p>
                          ) : isExpired ? (
                            <p className="mt-2 rounded-[14px] bg-amber-50 px-3 py-2.5 text-[11px] font-semibold leading-snug text-amber-900 ring-1 ring-amber-200/60">
                              {t(locale, "mLatePickupHint")}
                            </p>
                          ) : (
                            <p className="mt-1 text-[12px] text-giu-muted">
                              {t(locale, "mOrderQty")} {r.quantity}
                              {t(locale, "mUnitQty")}
                            </p>
                          )}
                          <p className="mt-1 text-[12px] text-giu-muted">
                            {money(r.totalVnd)} · {t(locale, "mOrderFee")} {money(r.platformFeeVnd)} ·{" "}
                            {t(locale, "mOrderNet")} {money(net)}
                          </p>
                          <p className="text-[12px] text-giu-muted">
                            {formatPaymentStatusLocale(r.paymentStatus, locale)}{" "}
                            · {formatReservationStatusLocale(shown, locale)}
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
                        <MerchantOrderStatusBadge
                          locale={locale}
                          reservation={r}
                          boxPickupEnd={box?.pickupEnd}
                          policy={pickupPolicy}
                        />
                      </div>
                      {r.paymentStatus === "paid" &&
                      (shown === "giu_cho" || shown === "het_han") &&
                      box ? (
                        <div className="mt-2 space-y-2">
                      <MerchantExtensionReview
                        locale={locale}
                        reservation={r}
                        boxPickupStart={box?.pickupStart}
                        boxPickupEnd={box?.pickupEnd}
                        onDone={() => void load(merchant.id, { silent: true })}
                      />
                      {r.extensionRequest?.status !== "pending" &&
                      isExpired &&
                      merchantCanMarkNoShow(box.pickupEnd, pickupPolicy) ? (
                        <MerchantNoShowButton
                          locale={locale}
                          reservationId={r.id}
                          onDone={() => void load(merchant.id, { silent: true })}
                        />
                      ) : null}
                        </div>
                      ) : null}
                      {r.paymentStatus === "paid" &&
                      (shown === "giu_cho" || r.status === "da_lay" || shown === "het_han") ? (
                        <div className="mt-3">
                          <ReservationChatButton
                            locale={locale}
                            reservationId={r.id}
                            viewerRole="merchant"
                            peerName={r.customerName}
                            peerPhone={r.customerPhone}
                          />
                        </div>
                      ) : null}
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
          <div
            key="settings"
            className={`giu-tab-panel-3d space-y-4 ${tabSlide === "forward" ? "is-forward" : "is-back"}`}
          >
          <MerchantSettingsForm
            locale={locale}
            merchant={merchant}
            onSaved={() => void load(merchant.id, { silent: true })}
          />
          <MerchantCustomerInsights
            locale={locale}
            merchantId={merchant.id}
            reservations={reservations}
            onSelectCustomer={setCustomerDetailId}
          />
          <MerchantSettlementSummary
            locale={locale}
            merchant={merchant}
            reservations={reservations}
            panelHref={panelHref}
          />
          <MerchantReviewsClient locale={locale} merchantId={merchant.id} />
          <MerchantLogoutLink locale={locale} />
          </div>
        )}
      </div>

      <MerchantBankRegisterSheet
        locale={locale}
        open={bankSheetOpen}
        merchant={merchant}
        onClose={() => setBankSheetOpen(false)}
        onSaved={() => void load(merchant.id, { silent: true })}
      />

      <MerchantStatsSheet
        locale={locale}
        open={statFilter !== null}
        filter={statFilter}
        onClose={() => setStatFilter(null)}
        boxes={boxes}
        reservations={reservations}
        boxMap={boxMap}
        money={money}
        onChanged={() => void load(merchant.id, { silent: true })}
        merchant={merchant}
        onSelectCustomer={setCustomerDetailId}
      />

      <MerchantCustomerDetailSheet
        locale={locale}
        open={customerDetailId !== null}
        customerId={customerDetailId}
        onClose={() => setCustomerDetailId(null)}
        reservations={reservations}
        boxMap={boxMap}
        money={money}
        merchant={merchant}
        onChanged={() => void load(merchant.id, { silent: true })}
      />
    </div>
  );
}
