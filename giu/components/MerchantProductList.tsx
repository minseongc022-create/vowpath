"use client";

import { useEffect, useState } from "react";
import { formatBoxStatusLocale } from "@/giu/lib/box-ux";
import { categoryLabel } from "@/giu/lib/labels-locale";
import { formatMoney, formatPickupWindow } from "@/giu/lib/format";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuBox } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  boxes: GiuBox[];
  onChanged: () => Promise<void>;
};

type SheetMode = "view" | "edit";

export function MerchantProductList({ locale, boxes, onChanged }: Props) {
  const market = "kr" as const;
  const money = (n: number) => formatMoney(n, market);
  const [selected, setSelected] = useState<GiuBox | null>(null);
  const [mode, setMode] = useState<SheetMode>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  function closeSheet() {
    setSelected(null);
    setMode("view");
    setError("");
    setConfirmCancel(false);
  }

  function openDetail(box: GiuBox) {
    hapticSelect();
    setSelected(box);
    setMode("view");
    setError("");
    setConfirmCancel(false);
  }

  async function cancelListing() {
    if (!selected) return;
    hapticConfirm();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/giu/boxes/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "huy" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t(locale, "mCreateFail"));
        return;
      }
      hapticConfirm();
      closeSheet();
      await onChanged();
    } catch {
      setError(t(locale, "mLoadError"));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    hapticSelect();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/giu/boxes/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: fd.get("title"),
          description: String(fd.get("description") || "").trim() || undefined,
          imageUrl: String(fd.get("imageUrl") || "").trim() || "",
          freshnessNote: String(fd.get("freshnessNote") || "").trim() || undefined,
          originalPriceVnd: Number(fd.get("originalPriceVnd")),
          salePriceVnd: Number(fd.get("salePriceVnd")),
          quantityTotal: Number(fd.get("quantityTotal")),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t(locale, "mCreateFail"));
        return;
      }
      const data = (await res.json()) as { box: GiuBox };
      hapticConfirm();
      setSelected(data.box);
      setMode("view");
      await onChanged();
    } catch {
      setError(t(locale, "mLoadError"));
    } finally {
      setBusy(false);
    }
  }

  const canCancel = selected?.status === "mo";

  return (
    <>
      <section>
        <h2 className="font-bold">
          {t(locale, "mListed")} ({boxes.length})
        </h2>
        {boxes.length === 0 ? (
          <p className="mt-3 text-[13px] text-giu-muted">{t(locale, "mNoBoxes")}</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {boxes.map((box, i) => (
              <li
                key={box.id}
                className="giu-card-interactive giu-stagger-item flex gap-3 p-3"
                style={{ animationDelay: `${Math.min(i, 6) * 35}ms` }}
              >
                {box.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={box.imageUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-giu-border"
                  />
                ) : null}
                <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{box.title}</p>
                    <p className="text-[12px] text-giu-muted">
                      {money(box.salePriceVnd)} · {box.quantityLeft}/{box.quantityTotal} ·{" "}
                      {formatBoxStatusLocale(box.status, locale)}
                    </p>
                    <p className="text-[11px] text-giu-muted">
                      {formatPickupWindow(box.pickupStart, box.pickupEnd, market)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDetail(box)}
                    className="giu-btn-3d giu-tap shrink-0 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-giu-accent ring-1 ring-giu-border"
                  >
                    {t(locale, "mViewDetail")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected ? (
        <div className="giu-sheet-backdrop" onClick={closeSheet} role="presentation">
          <div
            className="giu-sheet giu-sheet-enter"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="giu-product-sheet-title"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-giu-border" />

            {mode === "view" ? (
              <div className="giu-panel-enter space-y-3">
                <div>
                  <h3 id="giu-product-sheet-title" className="text-[17px] font-bold text-giu-ink">
                    {selected.title}
                  </h3>
                  <p className="mt-1 text-[12px] font-medium text-giu-accent">
                    {formatBoxStatusLocale(selected.status, locale)}
                  </p>
                </div>

                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.imageUrl}
                    alt=""
                    className="max-h-40 w-full rounded-[16px] object-cover ring-1 ring-giu-border"
                  />
                ) : null}

                <dl className="grid grid-cols-2 gap-2 text-[13px]">
                  {(
                    [
                      [t(locale, "mSale"), money(selected.salePriceVnd)],
                      [t(locale, "mOriginal"), money(selected.originalPriceVnd)],
                      [t(locale, "mQty"), `${selected.quantityLeft}/${selected.quantityTotal}`],
                      [t(locale, "mCategory"), categoryLabel(selected.category, locale)],
                      [t(locale, "time"), formatPickupWindow(selected.pickupStart, selected.pickupEnd, market)],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="rounded-[12px] bg-giu-bg px-3 py-2 ring-1 ring-giu-border">
                      <dt className="text-[10px] font-medium text-giu-muted">{label}</dt>
                      <dd className="mt-0.5 font-semibold text-giu-ink">{value}</dd>
                    </div>
                  ))}
                </dl>

                {selected.description ? (
                  <p className="text-[13px] leading-relaxed text-giu-muted">{selected.description}</p>
                ) : null}
                {selected.freshnessNote ? (
                  <p className="giu-info-banner text-[12px]">{selected.freshnessNote}</p>
                ) : null}

                {error ? <p className="text-[12px] text-giu-danger">{error}</p> : null}

                {confirmCancel ? (
                  <div className="giu-panel-enter space-y-2 rounded-[16px] bg-red-50 p-3 ring-1 ring-red-100">
                    <p className="text-[13px] font-bold text-giu-ink">{t(locale, "mCancelListingConfirm")}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void cancelListing()}
                        className="giu-btn-danger giu-btn-3d flex-1 !py-2.5 text-[13px]"
                      >
                        {busy ? t(locale, "loading") : t(locale, "mCancelListingYes")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(false)}
                        className="giu-btn-secondary giu-btn-3d flex-1 !py-2.5 text-[13px]"
                      >
                        {t(locale, "mCloseNo")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        hapticSelect();
                        setMode("edit");
                        setError("");
                      }}
                      className="giu-btn-primary giu-btn-3d flex-1 !py-3"
                    >
                      {t(locale, "mEditProduct")}
                    </button>
                    {canCancel ? (
                      <button
                        type="button"
                        onClick={() => {
                          hapticSelect();
                          setConfirmCancel(true);
                        }}
                        className="giu-btn-danger giu-btn-3d flex-1 !py-3"
                      >
                        {t(locale, "mCancelListing")}
                      </button>
                    ) : null}
                  </div>
                )}

                <button type="button" onClick={closeSheet} className="giu-btn-ghost giu-tap w-full !py-2 text-[13px]">
                  {t(locale, "mCloseSheet")}
                </button>
              </div>
            ) : (
              <form onSubmit={saveEdit} className="giu-panel-enter space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[17px] font-bold text-giu-ink">{t(locale, "mEditProduct")}</h3>
                  <button
                    type="button"
                    onClick={() => setMode("view")}
                    className="text-[13px] font-bold text-giu-muted"
                  >
                    {t(locale, "mCloseNo")}
                  </button>
                </div>

                <div>
                  <label className="giu-label">{t(locale, "mTitle")}</label>
                  <input name="title" required defaultValue={selected.title} className="giu-input" />
                </div>
                <div>
                  <label className="giu-label">{t(locale, "mDesc")}</label>
                  <input name="description" defaultValue={selected.description ?? ""} className="giu-input" />
                </div>
                <div>
                  <label className="giu-label">{t(locale, "mPhoto")}</label>
                  <input name="imageUrl" type="url" defaultValue={selected.imageUrl ?? ""} className="giu-input" />
                </div>
                <div>
                  <label className="giu-label">{t(locale, "mFresh")}</label>
                  <input name="freshnessNote" defaultValue={selected.freshnessNote ?? ""} className="giu-input" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="giu-label">{t(locale, "mOriginal")}</label>
                    <input
                      name="originalPriceVnd"
                      type="number"
                      required
                      min={1000}
                      step={500}
                      defaultValue={selected.originalPriceVnd}
                      className="giu-input"
                    />
                  </div>
                  <div>
                    <label className="giu-label">{t(locale, "mSale")}</label>
                    <input
                      name="salePriceVnd"
                      type="number"
                      required
                      min={500}
                      step={500}
                      defaultValue={selected.salePriceVnd}
                      className="giu-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="giu-label">{t(locale, "mQty")}</label>
                  <input
                    name="quantityTotal"
                    type="number"
                    required
                    min={1}
                    max={50}
                    defaultValue={selected.quantityTotal}
                    className="giu-input"
                  />
                </div>

                {error ? <p className="text-[12px] text-giu-danger">{error}</p> : null}

                <button type="submit" disabled={busy} className="giu-btn-primary giu-btn-3d py-3.5">
                  {busy ? t(locale, "loading") : t(locale, "mSaveEdit")}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
