"use client";

import { formatDiscount, formatMoney, formatPickupWindow } from "@/giu/lib/format";
import { formatMadeAt, storageMethodLabel } from "@/giu/lib/freshness";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuStorageMethod } from "@/giu/lib/types";

export type PickupPreview = {
  reservation: {
    id: string;
    customerName: string;
    customerPhone: string;
    quantity: number;
    totalVnd: number;
    platformFeeVnd: number;
    code: string;
  };
  box: {
    title: string;
    description?: string;
    imageUrl?: string;
    pickupStart: string;
    pickupEnd: string;
    salePriceVnd: number;
    originalPriceVnd: number;
    madeAt?: string;
    bestBefore?: string;
    freshnessNote?: string;
    storageMethod?: string;
    storageCustom?: string;
  } | null;
  netPayoutVnd: number;
};

type Props = {
  locale: GiuLocale;
  preview: PickupPreview;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function MerchantPickupConfirm({ locale, preview, busy, onConfirm, onCancel }: Props) {
  const money = (n: number) => formatMoney(n, "kr");
  const { reservation: r, box } = preview;
  const unitPrice = box ? box.salePriceVnd : Math.round(r.totalVnd / Math.max(1, r.quantity));

  return (
    <div className="space-y-3 rounded-[18px] bg-white p-4 ring-2 ring-giu-primary/25">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-giu-primary">
          {t(locale, "mPickupConfirmTitle")}
        </p>
        <p className="mt-1 text-[20px] font-extrabold tracking-tight text-giu-ink">{r.customerName}</p>
        <p className="mt-0.5 text-[14px] font-semibold text-giu-muted">{r.customerPhone}</p>
        <p className="mt-1 text-[12px] font-bold text-giu-ink">
          {t(locale, "mPickupConfirmCode")}: {r.code}
        </p>
      </div>

      {box ? (
        <div className="overflow-hidden rounded-[14px] bg-giu-bg/80 ring-1 ring-giu-border">
          <div className="flex gap-3 p-3">
            {box.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={box.imageUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white text-2xl">
                🍱
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-giu-primary">{t(locale, "mPickupConfirmMenu")}</p>
              <p className="mt-0.5 text-[15px] font-extrabold leading-snug text-giu-ink">{box.title}</p>
              {box.description ? (
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-giu-muted">{box.description}</p>
              ) : null}
            </div>
          </div>
          <dl className="space-y-1.5 border-t border-giu-border px-3 py-2.5 text-[12px]">
            <div className="flex justify-between gap-2">
              <dt className="text-giu-muted">{t(locale, "mPickupConfirmQty")}</dt>
              <dd className="font-bold text-giu-ink">
                {r.quantity}
                {t(locale, "mUnitQty")}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-giu-muted">{t(locale, "mPickupConfirmUnitPrice")}</dt>
              <dd className="font-bold text-giu-ink">
                {money(unitPrice)}
                {box.originalPriceVnd > box.salePriceVnd ? (
                  <span className="ml-1 text-[11px] text-giu-muted line-through">
                    {money(box.originalPriceVnd)}
                  </span>
                ) : null}
              </dd>
            </div>
            {box.originalPriceVnd > box.salePriceVnd ? (
              <div className="flex justify-between gap-2">
                <dt className="text-giu-muted">{t(locale, "mPickupConfirmDiscount")}</dt>
                <dd className="font-bold text-giu-primary">
                  {formatDiscount(box.originalPriceVnd, box.salePriceVnd)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <dt className="text-giu-muted">{t(locale, "mPickupConfirmPickup")}</dt>
              <dd className="text-right font-bold text-giu-ink">
                {formatPickupWindow(box.pickupStart, box.pickupEnd, "kr")}
              </dd>
            </div>
            {box.madeAt ? (
              <div className="flex justify-between gap-2">
                <dt className="text-giu-muted">{t(locale, "freshMadeLabel")}</dt>
                <dd className="font-semibold text-giu-ink">{formatMadeAt(box.madeAt, locale)}</dd>
              </div>
            ) : null}
            {box.storageMethod ? (
              <div className="flex justify-between gap-2">
                <dt className="text-giu-muted">{t(locale, "freshStorageLabel")}</dt>
                <dd className="text-right font-semibold text-giu-ink">
                  {storageMethodLabel(box.storageMethod as GiuStorageMethod, locale)}
                  {box.storageCustom ? ` · ${box.storageCustom}` : ""}
                </dd>
              </div>
            ) : null}
            {box.freshnessNote ? (
              <div>
                <dt className="text-giu-muted">{t(locale, "freshStorePromise")}</dt>
                <dd className="mt-0.5 font-medium leading-snug text-giu-ink">{box.freshnessNote}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      <div className="rounded-[14px] bg-giu-primary-soft px-3 py-2.5 text-[12px]">
        <div className="flex justify-between font-semibold text-giu-ink">
          <span>{t(locale, "mOrderTotal")}</span>
          <span>{money(r.totalVnd)}</span>
        </div>
        <div className="mt-1 flex justify-between text-giu-muted">
          <span>{t(locale, "mOrderFee")}</span>
          <span>{money(r.platformFeeVnd)}</span>
        </div>
        <div className="mt-1 flex justify-between font-bold text-giu-primary">
          <span>{t(locale, "mOrderNet")}</span>
          <span>{money(preview.netPayoutVnd)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            hapticSelect();
            onCancel();
          }}
          className="giu-btn-secondary giu-btn-3d flex-1 !py-3 text-[14px]"
        >
          {t(locale, "mPickupConfirmNo")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            hapticConfirm();
            onConfirm();
          }}
          className="giu-btn-primary giu-btn-3d flex-1 !py-3 text-[14px]"
        >
          {busy ? t(locale, "loading") : t(locale, "mPickupConfirmYes")}
        </button>
      </div>
    </div>
  );
}
