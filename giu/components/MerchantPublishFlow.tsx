"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { GiuConfirmSheet } from "@/giu/components/GiuConfirmSheet";
import { GiuSuccessToast } from "@/giu/components/GiuSuccessToast";
import { GiuTrashButton } from "@/giu/components/GiuTrashButton";
import { ProductPhotoPicker } from "@/giu/components/ProductPhotoPicker";
import {
  MerchantFreshnessFields,
  freshnessFromBox,
  freshnessValueToPayload,
  validateFreshnessValue,
  type FreshnessFormValue,
} from "@/giu/components/MerchantFreshnessFields";
import { boxImages, boxImageFields } from "@/giu/lib/box-images";
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
import {
  filterHistoryBoxes,
  findDuplicateActiveListing,
  historyEmptyLabel,
  historyFilterLabel,
  type HistoryListFilter,
} from "@/giu/lib/product-list-ux";
import { marketTimeZone, quickPublishPrices } from "@/giu/lib/market";
import { parseQuantityInput, sanitizeQuantityInput } from "@/giu/lib/numeric-input";
import {
  PUBLISH_HOURS,
  republishScheduleFromBox,
} from "@/giu/lib/publish-schedule";
import type { GiuBox, GiuMarket, GiuMerchant } from "@/giu/lib/types";
import { JiucuMerchantHelp } from "@/giu/components/jiucu/JiucuMerchantHelp";

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
      {hint ? <span className="block text-[11px] font-semibold leading-snug text-giu-muted">{hint}</span> : null}
      {children}
    </label>
  );
}

function ScheduleFields({
  locale,
  dayOffset,
  startH,
  endH,
  onDayOffset,
  onStartH,
  onEndH,
}: {
  locale: GiuLocale;
  dayOffset: number;
  startH: number;
  endH: number;
  onDayOffset: (v: number) => void;
  onStartH: (v: number) => void;
  onEndH: (v: number) => void;
}) {
  return (
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
          onChange={(e) => onDayOffset(Number(e.target.value))}
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
            onChange={(e) => onStartH(Number(e.target.value))}
          >
            {PUBLISH_HOURS.map((h) => (
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
            onChange={(e) => onEndH(Number(e.target.value))}
          >
            {PUBLISH_HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
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
  const defaultPrices = quickPublishPrices(market);

  const [view, setView] = useState<PublishView>("idle");
  const [createError, setCreateError] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [republishBusy, setRepublishBusy] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [startH, setStartH] = useState(12);
  const [endH, setEndH] = useState(14);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(merchant.category);
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [freshness, setFreshness] = useState<FreshnessFormValue>(() => ({
    madeDate: new Date().toISOString().slice(0, 10),
    madeHour: new Date().getHours(),
    bestBefore: "",
    storageMethod: "fridge",
    storageCustom: "",
    freshnessNote: "",
  }));
  const [originalPrice, setOriginalPrice] = useState(defaultPrices.originalPriceVnd);
  const [salePrice, setSalePrice] = useState(defaultPrices.salePriceVnd);
  const [quantityText, setQuantityText] = useState("5");
  const [republishTarget, setRepublishTarget] = useState<GiuBox | null>(null);
  const [republishDayOffset, setRepublishDayOffset] = useState(0);
  const [republishStartH, setRepublishStartH] = useState(12);
  const [republishEndH, setRepublishEndH] = useState(14);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryListFilter>("all");
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GiuBox | null>(null);
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const photosPending = imageUrls.some((url) => url.startsWith("blob:"));
  const pendingPublishRef = useRef<(() => void | Promise<void>) | null>(null);

  const historyBoxes = useMemo(
    () => filterHistoryBoxes(boxes, historyFilter),
    [boxes, historyFilter],
  );

  const mostRecentBox = useMemo(
    () =>
      boxes
        .filter((b) => b.merchantId === merchant.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null,
    [boxes, merchant.id],
  );

  function resetComposeForm() {
    setTitle("");
    setDescription("");
    setCategory(merchant.category);
    setImageUrls([]);
    setFreshness({
      madeDate: new Date().toISOString().slice(0, 10),
      madeHour: new Date().getHours(),
      bestBefore: "",
      storageMethod: "fridge",
      storageCustom: "",
      freshnessNote: t(locale, "mFreshDefault"),
    });
    setOriginalPrice(defaultPrices.originalPriceVnd);
    setSalePrice(defaultPrices.salePriceVnd);
    setQuantityText("5");
    setDayOffset(0);
    setStartH(12);
    setEndH(14);
    setCreateError("");
  }

  function openCompose() {
    resetComposeForm();
    setView("compose");
  }

  function loadRecentListing() {
    if (!mostRecentBox) {
      setCreateError(t(locale, "mNoRecentListing"));
      return;
    }
    hapticSelect();
    setTitle(mostRecentBox.title);
    setCategory(mostRecentBox.category);
    setDescription(mostRecentBox.description ?? "");
    setImageUrls(boxImages(mostRecentBox));
    setFreshness({
      ...freshnessFromBox(mostRecentBox),
      freshnessNote: mostRecentBox.freshnessNote ?? t(locale, "mFreshDefault"),
    });
    setOriginalPrice(mostRecentBox.originalPriceVnd);
    setSalePrice(mostRecentBox.salePriceVnd);
    setQuantityText(String(mostRecentBox.quantityTotal));
    const schedule = republishScheduleFromBox(mostRecentBox, market);
    setDayOffset(schedule.dayOffset);
    setStartH(schedule.startH);
    setEndH(schedule.endH);
    setCreateError("");
  }

  function goIdle() {
    setView("idle");
    setCreateError("");
    setRepublishTarget(null);
    setHistoryFilter("all");
  }

  function requestDuplicateConfirm(action: () => void | Promise<void>) {
    pendingPublishRef.current = action;
    setDuplicateConfirmOpen(true);
  }

  function checkDuplicateAndRun(
    sig: { title: string; originalPriceVnd: number; salePriceVnd: number },
    action: () => void | Promise<void>,
  ) {
    if (findDuplicateActiveListing(boxes, merchant.id, sig)) {
      requestDuplicateConfirm(action);
      return;
    }
    void action();
  }

  function confirmDuplicateListing() {
    hapticConfirm();
    const action = pendingPublishRef.current;
    pendingPublishRef.current = null;
    setDuplicateConfirmOpen(false);
    if (action) void action();
  }

  function cancelDuplicateListing() {
    hapticSelect();
    pendingPublishRef.current = null;
    setDuplicateConfirmOpen(false);
  }

  async function submitCreateBox() {
    if (endH <= startH) {
      setCreateError(t(locale, "mTimeOrder"));
      return;
    }
    const quantity = parseQuantityInput(quantityText);
    if (!quantity) {
      setCreateError(t(locale, "mQtyInvalid"));
      return;
    }
    const freshErr = validateFreshnessValue(freshness, locale);
    if (freshErr) {
      setCreateError(freshErr);
      return;
    }
    setSubmitBusy(true);
    const tz = marketTimeZone(market);
    const pickupStart = localToIso(dayOffset, startH, 0, tz);
    const pickupEnd = localToIso(dayOffset, endH, 0, tz);
    try {
      const res = await fetch("/api/giu/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
          body: JSON.stringify({
          title,
          description: description || undefined,
          ...boxImageFields(imageUrls),
          category,
          originalPriceVnd: originalPrice,
          salePriceVnd: salePrice,
          quantityTotal: quantity,
          ...freshnessValueToPayload(freshness),
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
      await onPublished();
      goIdle();
      setSuccessMsg(t(locale, "toastPublishSuccess"));
    } catch {
      setCreateError(t(locale, "mLoadError"));
    } finally {
      setSubmitBusy(false);
    }
  }

  function createBox(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    hapticSelect();
    setCreateError("");
    checkDuplicateAndRun(
      {
        title,
        originalPriceVnd: originalPrice,
        salePriceVnd: salePrice,
      },
      () => void submitCreateBox(),
    );
  }

  async function submitRepublish() {
    if (!republishTarget) return;
    if (republishEndH <= republishStartH) {
      setCreateError(t(locale, "mTimeOrder"));
      return;
    }
    setRepublishBusy(true);
    setCreateError("");
    try {
      const res = await fetch("/api/giu/boxes/republish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          boxId: republishTarget.id,
          dayOffset: republishDayOffset,
          pickupStartH: republishStartH,
          pickupEndH: republishEndH,
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
      setSuccessMsg(t(locale, "toastRepublishSuccess"));
    } catch {
      setCreateError(t(locale, "mLoadError"));
    } finally {
      setRepublishBusy(false);
    }
  }

  function confirmRepublish() {
    if (!republishTarget) return;
    hapticConfirm();
    setCreateError("");
    checkDuplicateAndRun(
      {
        title: republishTarget.title,
        originalPriceVnd: republishTarget.originalPriceVnd,
        salePriceVnd: republishTarget.salePriceVnd,
      },
      () => void submitRepublish(),
    );
  }

  function openRepublishConfirm(box: GiuBox) {
    hapticSelect();
    setRepublishTarget(box);
    const schedule = republishScheduleFromBox(box, market);
    setRepublishDayOffset(schedule.dayOffset);
    setRepublishStartH(schedule.startH);
    setRepublishEndH(schedule.endH);
    setView("confirm");
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

  return (
    <section id="giu-publish-flow" className="giu-card giu-panel-enter space-y-3">
      <div>
        <h2 className="font-extrabold text-giu-ink">{t(locale, "mPublish")}</h2>
        <p className="mt-0.5 text-[12px] font-semibold text-giu-muted">{t(locale, "mPublishHint")}</p>
      </div>

      {view === "idle" ? (
        <div className="space-y-3">
          <JiucuMerchantHelp locale={locale} caption={t(locale, "jiucuPublishIdle")} />
          <button
            type="button"
            onClick={openCompose}
            className="giu-btn-primary giu-btn-3d !py-3.5 text-[15px]"
          >
            {t(locale, "mPostProduct")}
          </button>
          <button
            type="button"
            onClick={() => setView("history")}
            className="giu-btn-secondary giu-btn-3d !py-3 text-[14px]"
          >
            {t(locale, "mViewPastProducts")}
          </button>
        </div>
      ) : null}

      {view === "compose" ? (
        <form onSubmit={createBox} className="giu-panel-enter space-y-3">
          <div className="flex items-center justify-between gap-2">
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
            {mostRecentBox ? (
              <button
                type="button"
                onClick={loadRecentListing}
                className="giu-btn-3d rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-giu-primary ring-1 ring-giu-primary/25"
              >
                {t(locale, "mLoadRecentListing")}
              </button>
            ) : null}
          </div>

          <div className="giu-info-banner text-[12px] leading-relaxed">
            {t(locale, "mQuickPublishDetail")}
          </div>

          <Field label={t(locale, "mTitle")}>
            <input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 버터 크루아상 2개"
              className="giu-input"
            />
          </Field>

          <Field label={t(locale, "mCategory")} hint={t(locale, "mCategoryHint")}>
            <div className="flex flex-wrap gap-1.5">
              {publishCategories.map((c) => {
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`giu-tap rounded-full px-3 py-2 text-[12px] font-bold transition ${
                      active
                        ? "bg-giu-ink text-white shadow-[0_4px_12px_rgba(60,42,33,0.18)]"
                        : "bg-white text-giu-muted ring-1 ring-giu-border"
                    }`}
                  >
                    {c.emoji} {c.label}
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="category" value={category} />
          </Field>

          <Field label={t(locale, "mDesc")} hint={t(locale, "mDescHint")}>
            <input
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="giu-input"
            />
          </Field>

          <Field label={t(locale, "mPhoto")} hint={t(locale, "mPhotoHint")}>
            <ProductPhotoPicker
              locale={locale}
              value={imageUrls}
              onChange={setImageUrls}
              onError={setCreateError}
            />
          </Field>

          <MerchantFreshnessFields
            locale={locale}
            value={freshness}
            onChange={setFreshness}
            error={createError.includes("제조") || createError.includes("보관") ? createError : undefined}
          />

          <ScheduleFields
            locale={locale}
            dayOffset={dayOffset}
            startH={startH}
            endH={endH}
            onDayOffset={setDayOffset}
            onStartH={setStartH}
            onEndH={setEndH}
          />

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
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(Number(e.target.value))}
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
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={quantityText}
              onChange={(e) => setQuantityText(sanitizeQuantityInput(e.target.value))}
              className="giu-input"
            />
          </Field>

          {createError ? <p className="text-sm text-giu-danger">{createError}</p> : null}

          <button
            type="submit"
            disabled={submitBusy || photosPending}
            className="giu-btn-primary giu-btn-3d py-3.5"
          >
            {submitBusy
              ? t(locale, "mQuickPublishing")
              : photosPending
                ? t(locale, "mPhotoUploading")
                : t(locale, "mPostProduct")}
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
            {(["all", "closed", "cancelled"] as const).map((f) => (
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
            <p className="text-[13px] text-giu-muted">{historyEmptyLabel(locale, historyFilter)}</p>
          ) : (
            <ul className="space-y-2">
              {historyBoxes.map((box, index) => (
                <li
                  key={box.id}
                  className={`flex items-start gap-3 rounded-[16px] p-3 ring-1 ${
                    index === 0 && historyFilter === "all"
                      ? "bg-giu-accent-soft/70 ring-giu-primary/20"
                      : "bg-giu-bg ring-giu-border"
                  }`}
                >
                  {boxImages(box)[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={boxImages(box)[0]} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-giu-ink">{box.title}</p>
                    <p className="text-[12px] text-giu-muted">
                      {money(box.salePriceVnd)} · {box.quantityTotal}
                      {t(locale, "mUnitQty")} ·{" "}
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
                    {box.status !== "mo" || box.quantityLeft === 0 ? (
                      <button
                        type="button"
                        onClick={() => openRepublishConfirm(box)}
                        className="giu-btn-3d shrink-0 rounded-xl bg-giu-primary px-3 py-2 text-[11px] font-bold text-white"
                      >
                        {t(locale, "mRepublishThis")}
                      </button>
                    ) : null}
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
              {money(republishTarget.salePriceVnd)} · {republishTarget.quantityTotal}
              {t(locale, "mUnitQty")}
            </p>
            {republishTarget.description ? (
              <p className="mt-1 text-[12px] text-giu-muted">{republishTarget.description}</p>
            ) : null}
            <p className="mt-2 text-[12px] text-giu-muted">{t(locale, "mRepublishConfirmHint")}</p>
          </div>
          <ScheduleFields
            locale={locale}
            dayOffset={republishDayOffset}
            startH={republishStartH}
            endH={republishEndH}
            onDayOffset={setRepublishDayOffset}
            onStartH={setRepublishStartH}
            onEndH={setRepublishEndH}
          />
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
        open={duplicateConfirmOpen}
        title={t(locale, "mDuplicateListingTitle")}
        message={t(locale, "mDuplicateListingConfirm")}
        confirmLabel={t(locale, "mDuplicateListingYes")}
        cancelLabel={t(locale, "mCloseNo")}
        onConfirm={confirmDuplicateListing}
        onCancel={cancelDuplicateListing}
      />

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
