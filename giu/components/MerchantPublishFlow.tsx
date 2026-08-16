"use client";

import { useMemo, useState, type ReactNode } from "react";
import { GiuConfirmSheet } from "@/giu/components/GiuConfirmSheet";
import { GiuSuccessToast } from "@/giu/components/GiuSuccessToast";
import { GiuTrashButton } from "@/giu/components/GiuTrashButton";
import { merchantCategories } from "@/giu/lib/categories";
import {
  formatMoney,
  formatPickupWindow,
  localToIso,
  moneySymbol,
} from "@/giu/lib/format";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { filterHistoryBoxes, historyFilterLabel, type HistoryListFilter } from "@/giu/lib/product-list-ux";
import { marketTimeZone, quickPublishPrices } from "@/giu/lib/market";
import type { GiuBox, GiuMarket, GiuMerchant } from "@/giu/lib/types";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

type PublishView = "idle" | "compose" | "history" | "confirm";

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

type Props = {
  locale: GiuLocale;
  merchant: GiuMerchant;
  boxes: GiuBox[];
  onPublished: () => Promise<void>;
};

export function MerchantPublishFlow({ locale, merchant, boxes, onPublished }: Props) {
  const market: GiuMarket = "kr";
  const money = (n: number) => formatMoney(n, market);
  const symbol = moneySymbol(market);
  const publishCategories = merchantCategories();

  const [view, setView] = useState<PublishView>("idle");
  const [createError, setCreateError] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [republishBusy, setRepublishBusy] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [startH, setStartH] = useState(12);
  const [endH, setEndH] = useState(14);
  const [republishTarget, setRepublishTarget] = useState<GiuBox | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryListFilter>("all");
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GiuBox | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);

  const historyBoxes = useMemo(
    () => filterHistoryBoxes(boxes, historyFilter),
    [boxes, historyFilter],
  );

  function goIdle() {
    setView("idle");
    setCreateError("");
    setRepublishTarget(null);
    setHistoryFilter("all");
  }

  async function createBox(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    hapticSelect();
    setCreateError("");
    setSubmitBusy(true);
    const fd = new FormData(e.currentTarget);
    const start = Number(fd.get("pickupStartH") ?? startH);
    const end = Number(fd.get("pickupEndH") ?? endH);
    const day = Number(fd.get("dayOffset") ?? dayOffset);
    if (end <= start) {
      setCreateError(t(locale, "mTimeOrder"));
      setSubmitBusy(false);
      return;
    }
    const tz = marketTimeZone(market);
    const pickupStart = localToIso(day, start, 0, tz);
    const pickupEnd = localToIso(day, end, 0, tz);
    try {
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
      await onPublished();
      goIdle();
      setSuccessMsg(t(locale, "toastPublishSuccess"));
    } catch {
      setCreateError(t(locale, "mLoadError"));
    } finally {
      setSubmitBusy(false);
    }
  }

  async function quickPublish() {
    hapticSelect();
    setCreateError("");
    setQuickBusy(true);
    const prices = quickPublishPrices(market);
    try {
      const res = await fetch("/api/giu/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: t(locale, "mSurpriseDefault"),
          category: merchant.category,
          originalPriceVnd: prices.originalPriceVnd,
          salePriceVnd: prices.salePriceVnd,
          quantityTotal: 5,
          freshnessNote: t(locale, "mFreshDefault"),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setCreateError(data.error ?? t(locale, "mCreateFail"));
        return;
      }
      hapticConfirm();
      await onPublished();
      goIdle();
      setSuccessMsg(t(locale, "toastPublishSuccess"));
    } catch {
      setCreateError(t(locale, "mLoadError"));
    } finally {
      setQuickBusy(false);
    }
  }

  async function confirmRepublish() {
    if (!republishTarget) return;
    hapticConfirm();
    setRepublishBusy(true);
    setCreateError("");
    try {
      const res = await fetch("/api/giu/boxes/republish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ boxId: republishTarget.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setCreateError(data.error ?? t(locale, "mCreateFail"));
        return;
      }
      hapticConfirm();
      await onPublished();
      goIdle();
      setSuccessMsg(t(locale, "toastRepublishSuccess"));
    } catch {
      setCreateError(t(locale, "mLoadError"));
    } finally {
      setRepublishBusy(false);
    }
  }

  async function deleteProduct(boxId: string) {
    hapticConfirm();
    setDeleteBusyId(boxId);
    setCreateError("");
    try {
      const res = await fetch(`/api/giu/boxes/${boxId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setCreateError(data.error ?? t(locale, "mCreateFail"));
        return;
      }
      hapticConfirm();
      setDeleteTarget(null);
      if (republishTarget?.id === boxId) {
        setRepublishTarget(null);
        setView("history");
      }
      await onPublished();
      setSuccessMsg(t(locale, "toastDeleteSuccess"));
    } catch {
      setCreateError(t(locale, "mLoadError"));
    } finally {
      setDeleteBusyId(null);
    }
  }

  const hasActiveListing = useMemo(
    () => boxes.some((b) => b.status === "mo" && b.quantityLeft > 0),
    [boxes],
  );

  return (
    <section id="giu-publish-flow" className="giu-card giu-panel-enter space-y-3">
      <div>
        <h2 className="font-bold">{t(locale, "mPublish")}</h2>
        <p className="mt-0.5 text-[12px] text-giu-muted">{t(locale, "mPublishHint")}</p>
      </div>

      {view === "idle" ? (
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={quickBusy || hasActiveListing}
            onClick={() => void quickPublish()}
            className="giu-btn-primary giu-btn-3d !py-3.5 text-[15px]"
          >
            {quickBusy ? t(locale, "mQuickPublishing") : t(locale, "mQuickPublish")}
          </button>
          <p className="text-[11px] leading-snug text-giu-muted">{t(locale, "mQuickPublishSub")}</p>
          {hasActiveListing ? (
            <p className="text-[11px] font-semibold text-amber-700">{t(locale, "mActiveListingExists")}</p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              hapticSelect();
              setView("compose");
            }}
            className="giu-btn-secondary giu-btn-3d !py-3 text-[14px]"
          >
            {t(locale, "mAdvanced")}
          </button>
          <p className="text-[11px] text-giu-muted">{t(locale, "mAdvancedHint")}</p>
          <button
            type="button"
            onClick={() => {
              hapticSelect();
              setView("history");
            }}
            className="giu-btn-secondary giu-btn-3d !py-3 text-[14px]"
          >
            {t(locale, "mViewPastProducts")}
          </button>
        </div>
      ) : null}

      {view === "compose" ? (
        <form onSubmit={createBox} className="giu-panel-enter space-y-3">
          <button
            type="button"
            onClick={() => {
              hapticSelect();
              goIdle();
            }}
            className="text-[13px] font-bold text-giu-muted"
          >
            {t(locale, "mBackToStart")}
          </button>

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

          <div className="space-y-2 rounded-xl bg-giu-bg/80 p-3 ring-1 ring-giu-border">
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
                  min={1000}
                  step={500}
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
                  min={500}
                  step={500}
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

          {createError ? <p className="text-sm text-giu-danger">{createError}</p> : null}

          <button type="submit" disabled={submitBusy} className="giu-btn-primary giu-btn-3d py-3.5">
            {submitBusy ? t(locale, "mQuickPublishing") : t(locale, "mPostProduct")}
          </button>
        </form>
      ) : null}

      {view === "history" ? (
        <div className="giu-panel-enter space-y-3">
          <button
            type="button"
            onClick={() => {
              hapticSelect();
              goIdle();
            }}
            className="text-[13px] font-bold text-giu-muted"
          >
            {t(locale, "mBackToStart")}
          </button>

          <div className="giu-filter-tabs">
            {(["all", "cancelled"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  hapticSelect();
                  setHistoryFilter(f);
                }}
                className={`giu-filter-tab ${historyFilter === f ? "is-active" : ""}`}
              >
                {historyFilterLabel(locale, f)}
              </button>
            ))}
          </div>

          {historyBoxes.length === 0 ? (
            <p className="text-[13px] text-giu-muted">{t(locale, "mNoPastProducts")}</p>
          ) : (
            <ul className="space-y-2">
              {historyBoxes.map((box, index) => (
                <li
                  key={box.id}
                  className={`flex items-start gap-3 rounded-[16px] p-3 ring-1 ${
                    index === 0 && historyFilter === "all"
                      ? "bg-giu-accent-soft/70 ring-giu-accent/25"
                      : "bg-giu-bg ring-giu-border"
                  }`}
                >
                  {box.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={box.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-giu-ink">{box.title}</p>
                    <p className="text-[12px] text-giu-muted">
                      {money(box.salePriceVnd)} · {box.quantityTotal}개 ·{" "}
                      {formatPickupWindow(box.pickupStart, box.pickupEnd, market)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {box.status === "huy" ? (
                      <GiuTrashButton
                        label={t(locale, "mDeleteProduct")}
                        disabled={deleteBusyId === box.id}
                        onClick={() => setDeleteTarget(box)}
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        hapticSelect();
                        setRepublishTarget(box);
                        setView("confirm");
                      }}
                      className="giu-btn-3d shrink-0 rounded-xl bg-giu-accent px-3 py-2 text-[11px] font-bold text-white"
                    >
                      {t(locale, "mRepublishThis")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {view === "confirm" && republishTarget ? (
        <div className="giu-panel-enter space-y-3">
          <p className="text-[15px] font-bold text-giu-ink">{t(locale, "mRepublishConfirmTitle")}</p>
          <div className="rounded-[16px] bg-giu-bg p-3 ring-1 ring-giu-border">
            <p className="font-bold">{republishTarget.title}</p>
            <p className="mt-1 text-[13px] text-giu-muted">
              {money(republishTarget.salePriceVnd)} · {republishTarget.quantityTotal}개
            </p>
            {republishTarget.description ? (
              <p className="mt-1 text-[12px] text-giu-muted">{republishTarget.description}</p>
            ) : null}
            <p className="mt-2 text-[12px] text-giu-accent">{t(locale, "mRepublishConfirmHint")}</p>
          </div>
          {createError ? <p className="text-sm text-giu-danger">{createError}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={republishBusy}
              onClick={() => void confirmRepublish()}
              className="giu-btn-primary giu-btn-3d flex-1 !py-3"
            >
              {republishBusy ? t(locale, "loading") : t(locale, "mRepublishConfirmYes")}
            </button>
            <button
              type="button"
              onClick={() => {
                hapticSelect();
                setView("history");
                setRepublishTarget(null);
              }}
              className="giu-btn-secondary giu-btn-3d flex-1 !py-3"
            >
              {t(locale, "mRepublishConfirmNo")}
            </button>
          </div>
        </div>
      ) : null}

      {successMsg ? <GiuSuccessToast message={successMsg} onClose={() => setSuccessMsg(null)} /> : null}

      <GiuConfirmSheet
        open={!!deleteTarget}
        title={t(locale, "mConfirmDeleteTitle")}
        message={t(locale, "mDeleteConfirm")}
        confirmLabel={t(locale, "mDeleteProduct")}
        cancelLabel={t(locale, "mCloseNo")}
        danger
        busy={!!deleteBusyId}
        onConfirm={() => deleteTarget && void deleteProduct(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
