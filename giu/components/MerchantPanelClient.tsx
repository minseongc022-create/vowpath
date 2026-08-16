"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { merchantCategories } from "@/giu/lib/categories";
import {
  formatBoxStatusLocale,
  formatPaymentStatusLocale,
  formatReservationStatusLocale,
} from "@/giu/lib/box-ux";
import {
  defaultPickupWindow,
  formatMoney,
  formatPickupWindow,
  localToIso,
  moneySymbol,
} from "@/giu/lib/format";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import { marketTimeZone, quickPublishPrices } from "@/giu/lib/market";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuBox, GiuMarket, GiuReservation } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";
import { MerchantOrderAlerts } from "./MerchantOrderAlerts";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[12px] font-bold text-giu-ink">{label}</span>
      {hint ? <span className="block text-[11px] leading-snug text-giu-muted">{hint}</span> : null}
      {children}
    </label>
  );
}

export function MerchantPanelClient() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "orders" ? "orders" : "boxes";
  const { merchant, loading: authLoading } = useGiuAuth();
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const market: GiuMarket = merchant?.market === "kr" ? "kr" : merchant?.market === "vn" ? "vn" : "kr";
  const money = (n: number) => formatMoney(n, market);
  const symbol = moneySymbol(market);
  const publishCategories = merchantCategories();
  const [boxes, setBoxes] = useState<GiuBox[]>([]);
  const [reservations, setReservations] = useState<GiuReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState<"awaiting" | "all">("awaiting");
  const [createError, setCreateError] = useState("");
  const [dayOffset, setDayOffset] = useState(0);
  const [startH, setStartH] = useState(12);
  const [endH, setEndH] = useState(14);
  const [quickBusy, setQuickBusy] = useState(false);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
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

  async function createBox(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!merchant) return;
    hapticSelect();
    setCreateError("");
    const fd = new FormData(e.currentTarget);
    const start = Number(fd.get("pickupStartH") ?? startH);
    const end = Number(fd.get("pickupEndH") ?? endH);
    const day = Number(fd.get("dayOffset") ?? dayOffset);
    if (end <= start) {
      setCreateError(t(locale, "mTimeOrder"));
      return;
    }
    const tz = marketTimeZone(market);
    const pickupStart = localToIso(day, start, 0, tz);
    const pickupEnd = localToIso(day, end, 0, tz);
    const res = await fetch("/api/giu/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: fd.get("title"),
        description: fd.get("description") || undefined,
        imageUrl: String(fd.get("imageUrl") || "").trim() || undefined,
        category: fd.get("category") || undefined,
        originalPriceVnd: Number(fd.get("originalPriceVnd")),
        salePriceVnd: Number(fd.get("salePriceVnd")),
        quantityTotal: Number(fd.get("quantityTotal")),
        freshnessNote: fd.get("freshnessNote") || undefined,
        pickupStart,
        pickupEnd,
        expiresAt: pickupEnd,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setCreateError(data.error ?? t(locale, "mCreateFail"));
      return;
    }
    hapticConfirm();
    e.currentTarget.reset();
    setDayOffset(0);
    setStartH(12);
    setEndH(14);
    await load(merchant.id);
  }

  async function quickPublish() {
    if (!merchant) return;
    hapticSelect();
    setQuickBusy(true);
    setCreateError("");
    const win = defaultPickupWindow(2);
    const res = await fetch("/api/giu/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: t(locale, "mSurpriseDefault"),
        category: merchant.category,
        ...quickPublishPrices(market),
        quantityTotal: 5,
        freshnessNote: t(locale, "mFreshDefault"),
        pickupStart: win.start,
        pickupEnd: win.end,
        expiresAt: win.expires,
      }),
    });
    setQuickBusy(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setCreateError(data.error ?? t(locale, "mCreateFail"));
      return;
    }
    hapticConfirm();
    await load(merchant.id);
  }

  async function closeBox(boxId: string) {
    if (!merchant) return;
    hapticConfirm();
    await fetch(`/api/giu/boxes/${boxId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "huy" }),
    });
    setConfirmCloseId(null);
    await load(merchant.id);
  }

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
          <div className="rounded-[12px] bg-[#E8F1FE] px-3 py-2">
            <p className="text-[10px] font-medium text-[#2F7CF6]">{t(locale, "mAwaitingPickup")}</p>
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
        <>
          <section className="giu-card space-y-3">
            <div>
              <h2 className="font-bold">{t(locale, "mPublish")}</h2>
              <p className="mt-0.5 text-[12px] text-giu-muted">{t(locale, "mPublishHint")}</p>
            </div>

            <div className="rounded-2xl bg-giu-accent-soft/60 p-3 ring-1 ring-giu-accent/20">
              <p className="text-[12px] leading-snug text-giu-ink">{t(locale, "mQuickPublishDetail")}</p>
              <button
                type="button"
                disabled={quickBusy}
                onClick={() => void quickPublish()}
                className="giu-btn-primary mt-2.5 !py-3 text-[14px]"
              >
                {quickBusy ? t(locale, "mQuickPublishing") : t(locale, "mQuickPublish")}
              </button>
              <p className="mt-2 text-center text-[11px] font-medium text-giu-muted">
                {t(locale, "mQuickPublishSub")}
              </p>
            </div>
            {createError ? <p className="text-sm text-giu-danger">{createError}</p> : null}

            <details open className="rounded-xl bg-giu-bg/80 p-3 open:pb-3">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span className="block text-[13px] font-bold text-giu-ink">{t(locale, "mAdvanced")}</span>
                <span className="mt-0.5 block text-[11px] font-medium text-giu-muted">
                  {t(locale, "mAdvancedHint")}
                </span>
              </summary>
              <form onSubmit={createBox} className="mt-3 space-y-3">
                <Field label={t(locale, "mTitle")} hint={t(locale, "mTitleHint")}>
                  <input
                    name="title"
                    required
                    defaultValue={t(locale, "mSurpriseDefault")}
                    className="giu-input"
                  />
                </Field>

                <Field label={t(locale, "mCategory")} hint={t(locale, "mCategoryHint")}>
                  <select name="category" className="giu-input" defaultValue={merchant.category}>
                    {publishCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={t(locale, "mDesc")} hint={t(locale, "mDescHint")}>
                  <input name="description" className="giu-input" />
                </Field>

                <Field label={t(locale, "mPhoto")} hint={t(locale, "mPhotoHint")}>
                  <input name="imageUrl" type="url" inputMode="url" className="giu-input" />
                </Field>

                <Field label={t(locale, "mFresh")} hint={t(locale, "mFreshHint")}>
                  <input
                    name="freshnessNote"
                    defaultValue={t(locale, "mFreshDefault")}
                    className="giu-input"
                  />
                </Field>

                <div className="space-y-2 rounded-xl bg-white/70 p-3 ring-1 ring-giu-border">
                  <div>
                    <p className="text-[12px] font-bold text-giu-ink">{t(locale, "mSchedule")}</p>
                    <p className="mt-0.5 text-[11px] text-giu-muted">{t(locale, "mScheduleHint")}</p>
                  </div>
                  <Field label={t(locale, "mDay")}>
                    <select
                      name="dayOffset"
                      className="giu-input"
                      value={dayOffset}
                      onChange={(e) => setDayOffset(Number(e.target.value))}
                    >
                      <option value={0}>{t(locale, "mToday")}</option>
                      <option value={1}>{t(locale, "mTomorrow")}</option>
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t(locale, "mStart")}>
                      <select
                        name="pickupStartH"
                        className="giu-input"
                        value={startH}
                        onChange={(e) => setStartH(Number(e.target.value))}
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t(locale, "mEnd")}>
                      <select
                        name="pickupEndH"
                        className="giu-input"
                        value={endH}
                        onChange={(e) => setEndH(Number(e.target.value))}
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t(locale, "mOriginal")} hint={t(locale, "mOriginalHint")}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-giu-muted">
                        {symbol}
                      </span>
                      <input
                        name="originalPriceVnd"
                        required
                        type="number"
                        min={market === "kr" ? 1000 : 10000}
                        step={market === "kr" ? 500 : 1000}
                        defaultValue={quickPublishPrices(market).originalPriceVnd}
                        inputMode="numeric"
                        className="giu-input !pl-8"
                      />
                    </div>
                  </Field>
                  <Field label={t(locale, "mSale")} hint={t(locale, "mSaleHint")}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-giu-muted">
                        {symbol}
                      </span>
                      <input
                        name="salePriceVnd"
                        required
                        type="number"
                        min={market === "kr" ? 500 : 5000}
                        step={market === "kr" ? 500 : 1000}
                        defaultValue={quickPublishPrices(market).salePriceVnd}
                        inputMode="numeric"
                        className="giu-input !pl-8"
                      />
                    </div>
                  </Field>
                </div>

                <Field label={t(locale, "mQty")} hint={t(locale, "mQtyHint")}>
                  <input
                    name="quantityTotal"
                    required
                    type="number"
                    min={1}
                    max={50}
                    defaultValue={5}
                    inputMode="numeric"
                    className="giu-input"
                  />
                </Field>

                <button type="submit" className="giu-btn-primary py-3">
                  {t(locale, "mSubmit")}
                </button>
              </form>
            </details>
          </section>

          <section>
            <h2 className="font-bold">
              {t(locale, "mListed")} ({boxes.length})
            </h2>
            {boxes.length === 0 ? (
              <p className="mt-3 text-[13px] text-giu-muted">{t(locale, "mNoBoxes")}</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {boxes.map((box) => (
                  <li key={box.id} className="giu-card-flat flex gap-3 p-3 ring-1 ring-giu-border">
                    {box.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={box.imageUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : null}
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{box.title}</p>
                        <p className="text-[12px] text-giu-muted">
                          {money(box.salePriceVnd)} · {box.quantityLeft}/{box.quantityTotal} ·{" "}
                          {formatBoxStatusLocale(box.status, locale)}
                        </p>
                        <p className="text-[11px] text-giu-muted">
                          {formatPickupWindow(box.pickupStart, box.pickupEnd, market)}
                        </p>
                        {confirmCloseId === box.id ? (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => void closeBox(box.id)}
                              className="rounded-lg bg-giu-ink px-3 py-1.5 text-[11px] font-bold text-white"
                            >
                              {t(locale, "mCloseYes")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmCloseId(null)}
                              className="rounded-lg bg-giu-bg px-3 py-1.5 text-[11px] font-bold text-giu-muted"
                            >
                              {t(locale, "mCloseNo")}
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {box.status === "mo" && confirmCloseId !== box.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            hapticSelect();
                            setConfirmCloseId(box.id);
                          }}
                          className="shrink-0 rounded-xl bg-giu-bg px-3 py-1.5 text-[11px] font-bold text-giu-muted ring-1 ring-giu-border"
                        >
                          {t(locale, "mClose")}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <section className="space-y-3">
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
                        {money(r.totalVnd)} · {formatPaymentStatusLocale(r.paymentStatus, locale)}{" "}
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
                              className="rounded-xl bg-giu-accent px-4 py-2 text-[13px] font-bold text-white"
                            >
                              {t(locale, "mPickupYes")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmPickupId(null)}
                              className="rounded-xl bg-giu-bg px-4 py-2 text-[13px] font-bold text-giu-muted"
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
                        className="rounded-xl bg-giu-accent px-4 py-2 text-[13px] font-bold text-white"
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
      )}
    </div>
  );
}
