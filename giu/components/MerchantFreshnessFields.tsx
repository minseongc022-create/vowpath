"use client";

import { useMemo } from "react";
import {
  GIU_STORAGE_METHODS,
  buildMadeAtIso,
  parseMadeAtParts,
  storageMethodLabel,
} from "@/giu/lib/freshness";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuStorageMethod } from "@/giu/lib/types";

export type FreshnessFormValue = {
  madeDate: string;
  madeHour: number;
  bestBefore: string;
  storageMethod: GiuStorageMethod;
  storageCustom: string;
  freshnessNote: string;
};

type Props = {
  locale: GiuLocale;
  value: FreshnessFormValue;
  onChange: (next: FreshnessFormValue) => void;
  error?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function MerchantFreshnessFields({ locale, value, onChange, error }: Props) {
  const hourOptions = useMemo(
    () =>
      HOURS.map((h) => ({
        value: h,
        label: `${String(h).padStart(2, "0")}:00`,
      })),
    [],
  );

  function patch(partial: Partial<FreshnessFormValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="giu-freshness-fields space-y-3 rounded-[18px] bg-giu-primary-soft/60 p-3.5 ring-1 ring-giu-border">
      <div>
        <p className="text-[14px] font-extrabold text-giu-ink">{t(locale, "mFreshSection")}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-giu-muted">{t(locale, "mFreshSectionSub")}</p>
      </div>

      <div className="rounded-[14px] border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-[11px] leading-relaxed text-amber-950">
        {t(locale, "mFreshLegal")}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="giu-label">{t(locale, "mMadeAt")}</span>
          <input
            type="date"
            required
            value={value.madeDate}
            onChange={(e) => patch({ madeDate: e.target.value })}
            className="giu-input mt-1"
          />
        </label>
        <label className="block">
          <span className="giu-label">{t(locale, "mMadeHour")}</span>
          <select
            value={value.madeHour}
            onChange={(e) => patch({ madeHour: Number(e.target.value) })}
            className="giu-input mt-1"
          >
            {hourOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="giu-label">{t(locale, "mStorageMethod")}</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {GIU_STORAGE_METHODS.map((method) => {
            const active = value.storageMethod === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => patch({ storageMethod: method })}
                className={`giu-tap rounded-full px-3 py-2 text-[12px] font-bold transition ${
                  active
                    ? "bg-giu-ink text-white shadow-[0_4px_12px_rgba(60,42,33,0.18)]"
                    : "bg-white text-giu-muted ring-1 ring-giu-border"
                }`}
              >
                {storageMethodLabel(method, locale)}
              </button>
            );
          })}
        </div>
      </div>

      {value.storageMethod === "other" ? (
        <label className="block">
          <span className="giu-label">{t(locale, "mStorageCustom")}</span>
          <input
            value={value.storageCustom}
            onChange={(e) => patch({ storageCustom: e.target.value.slice(0, 120) })}
            placeholder={t(locale, "mStorageCustomPh")}
            className="giu-input mt-1"
            required
          />
        </label>
      ) : null}

      <label className="block">
        <span className="giu-label">{t(locale, "mBestBefore")}</span>
        <input
          type="date"
          value={value.bestBefore}
          onChange={(e) => patch({ bestBefore: e.target.value })}
          className="giu-input mt-1"
        />
        <span className="mt-1 block text-[10px] text-giu-muted">{t(locale, "mBestBeforeHint")}</span>
      </label>

      <label className="block">
        <span className="giu-label">{t(locale, "mFresh")}</span>
        <input
          value={value.freshnessNote}
          onChange={(e) => patch({ freshnessNote: e.target.value.slice(0, 200) })}
          placeholder={t(locale, "mFreshDefault")}
          className="giu-input mt-1"
        />
        <span className="mt-1 block text-[10px] text-giu-muted">{t(locale, "mFreshHint")}</span>
      </label>

      {error ? <p className="text-[12px] font-semibold text-giu-danger">{error}</p> : null}
    </div>
  );
}

export function freshnessValueToPayload(value: FreshnessFormValue) {
  return {
    madeAt: buildMadeAtIso(value.madeDate, value.madeHour),
    bestBefore: value.bestBefore ? new Date(`${value.bestBefore}T23:59:59`).toISOString() : undefined,
    storageMethod: value.storageMethod,
    storageCustom:
      value.storageMethod === "other" ? value.storageCustom.trim() || undefined : undefined,
    freshnessNote: value.freshnessNote.trim() || undefined,
  };
}

export function freshnessFromBox(box: {
  madeAt?: string;
  bestBefore?: string;
  storageMethod?: GiuStorageMethod;
  storageCustom?: string;
  freshnessNote?: string;
}): FreshnessFormValue {
  const { date, hour } = parseMadeAtParts(box.madeAt);
  return {
    madeDate: date,
    madeHour: hour,
    bestBefore: box.bestBefore ? box.bestBefore.slice(0, 10) : "",
    storageMethod: box.storageMethod ?? "fridge",
    storageCustom: box.storageCustom ?? "",
    freshnessNote: box.freshnessNote ?? "",
  };
}

export function validateFreshnessValue(value: FreshnessFormValue, locale: GiuLocale): string | null {
  if (!value.madeDate) return t(locale, "mFreshMadeRequired");
  if (value.storageMethod === "other" && !value.storageCustom.trim()) {
    return t(locale, "mFreshStorageRequired");
  }
  return null;
}
