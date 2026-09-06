"use client";

import { useState } from "react";
import { merchantCategories } from "@/giu/lib/categories";
import { merchantDistricts } from "@/giu/lib/districts";
import { hapticConfirm } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { resolvePickupPolicy } from "@/giu/lib/pickup-policy";
import type { GiuMerchant } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";

type PolicyFieldProps = {
  label: string;
  name: string;
  defaultValue: number;
  min: number;
  max: number;
  unit: string;
};

function PolicyNumberField({ label, name, defaultValue, min, max, unit }: PolicyFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] bg-white/70 px-3 py-2.5 ring-1 ring-giu-border">
      <label htmlFor={name} className="min-w-0 flex-1 text-[12px] font-semibold leading-snug text-giu-ink">
        {label}
      </label>
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          id={name}
          name={name}
          type="number"
          min={min}
          max={max}
          defaultValue={defaultValue}
          className="giu-input !w-[72px] !min-w-[72px] px-2 py-2 text-center text-[15px] font-bold tabular-nums"
        />
        <span className="w-[52px] text-[11px] font-semibold text-giu-muted">{unit}</span>
      </div>
    </div>
  );
}

type Props = {
  locale: GiuLocale;
  merchant: GiuMerchant;
  onSaved?: (merchant: GiuMerchant) => void;
};

export function MerchantSettingsForm({ locale, merchant, onSaved }: Props) {
  const { refresh } = useGiuAuth();
  const categories = merchantCategories();
  const districts = merchantDistricts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const policy = resolvePickupPolicy(merchant);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/giu/merchants/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: fd.get("name"),
          address: fd.get("address"),
          addressHint: fd.get("addressHint") || undefined,
          phone: fd.get("phone"),
          category: fd.get("category"),
          district: fd.get("district"),
          bankName: String(fd.get("bankName") ?? ""),
          bankAccount: String(fd.get("bankAccount") ?? ""),
          bankHolder: String(fd.get("bankHolder") ?? ""),
          pickupPolicy: {
            cancelFreeBeforeMinutes: Number(fd.get("cancelFreeBeforeMinutes")),
            extensionRequestBeforeMinutes: Number(fd.get("extensionRequestBeforeMinutes")),
            pickupGraceMinutes: Number(fd.get("pickupGraceMinutes")),
            lateCancelFeeRate: Number(fd.get("lateCancelFeeRate")) / 100,
            noShowFeeRate: Number(fd.get("noShowFeeRate")) / 100,
            merchantNoShowMarkAfterHours: Number(fd.get("merchantNoShowMarkAfterHours")),
          },
        }),
      });
      const data = (await res.json()) as { error?: string; merchant?: GiuMerchant };
      if (!res.ok) {
        setError(data.error ?? t(locale, "mLoadError"));
        return;
      }
      hapticConfirm();
      setSaved(true);
      if (data.merchant) onSaved?.(data.merchant);
      await refresh();
    } catch {
      setError(t(locale, "mLoadError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      key={`${merchant.id}-${merchant.bankName ?? ""}-${merchant.bankAccount ?? ""}-${merchant.phone}`}
      onSubmit={submit}
      className="giu-card space-y-3"
    >
      <div>
        <h2 className="text-[17px] font-bold text-giu-ink">{t(locale, "mSettingsTitle")}</h2>
        <p className="mt-0.5 text-[12px] text-giu-muted">{t(locale, "mSettingsSub")}</p>
      </div>
      <div>
        <label className="giu-label">{t(locale, "mStoreName")}</label>
        <input name="name" required defaultValue={merchant.name} className="giu-input" />
      </div>
      <div>
        <label className="giu-label">{t(locale, "mCategory")}</label>
        <select name="category" defaultValue={merchant.category} className="giu-input">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="giu-label">{t(locale, "mDistrict")}</label>
        <select name="district" defaultValue={merchant.district} className="giu-input">
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="giu-label">{t(locale, "address")}</label>
        <input name="address" required minLength={5} defaultValue={merchant.address} className="giu-input" />
      </div>
      <div>
        <label className="giu-label">{t(locale, "mAddressHint")}</label>
        <input name="addressHint" defaultValue={merchant.addressHint ?? ""} className="giu-input giu-input-hint" placeholder={t(locale, "mAddressHintPh")} />
      </div>
      <div>
        <label className="giu-label">{t(locale, "mStorePhone")}</label>
        <input name="phone" required type="tel" defaultValue={merchant.phone} className="giu-input" />
      </div>
      <div className="space-y-2 rounded-xl bg-giu-bg/80 p-3 ring-1 ring-giu-border">
        <p className="text-[12px] font-bold text-giu-ink">{t(locale, "mBankSection")}</p>
        <p className="text-[11px] text-giu-muted">{t(locale, "mBankHint")}</p>
        <div>
          <label className="giu-label">{t(locale, "mBankName")}</label>
          <input name="bankName" defaultValue={merchant.bankName ?? ""} className="giu-input giu-input-hint" placeholder={t(locale, "mBankNamePh")} />
        </div>
        <div>
          <label className="giu-label">{t(locale, "mBankAccount")}</label>
          <input name="bankAccount" inputMode="numeric" defaultValue={merchant.bankAccount ?? ""} className="giu-input giu-input-hint" placeholder={t(locale, "mBankAccountPh")} />
        </div>
        <div>
          <label className="giu-label">{t(locale, "mBankHolder")}</label>
          <input name="bankHolder" defaultValue={merchant.bankHolder ?? ""} className="giu-input giu-input-hint" placeholder={merchant.name} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setShowPolicy((v) => !v)}
        className="w-full rounded-xl bg-giu-bg/80 px-3 py-2.5 text-left text-[13px] font-bold text-giu-primary ring-1 ring-giu-border"
      >
        {showPolicy ? t(locale, "mPolicyHideAdvanced") : t(locale, "mPolicyShowAdvanced")}
      </button>
      {showPolicy ? (
      <div className="space-y-3 rounded-xl bg-giu-bg/80 p-3 ring-1 ring-giu-border">
        <div>
          <p className="text-[12px] font-bold text-giu-ink">{t(locale, "mPolicySection")}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-giu-muted">
            {t(locale, "mPolicySectionSub")}
          </p>
        </div>
        <div className="space-y-2">
          <PolicyNumberField
            label={t(locale, "mPolicyCancelFreeMin")}
            name="cancelFreeBeforeMinutes"
            defaultValue={policy.cancelFreeBeforeMinutes}
            min={15}
            max={240}
            unit={t(locale, "mPolicyUnitMinBefore")}
          />
          <PolicyNumberField
            label={t(locale, "mPolicyExtensionMin")}
            name="extensionRequestBeforeMinutes"
            defaultValue={policy.extensionRequestBeforeMinutes}
            min={5}
            max={120}
            unit={t(locale, "mPolicyUnitMinBefore")}
          />
          <PolicyNumberField
            label={t(locale, "mPolicyGraceMin")}
            name="pickupGraceMinutes"
            defaultValue={policy.pickupGraceMinutes}
            min={30}
            max={480}
            unit={t(locale, "mPolicyUnitMinAfter")}
          />
          <PolicyNumberField
            label={t(locale, "mPolicyLateCancelPct")}
            name="lateCancelFeeRate"
            defaultValue={Math.round(policy.lateCancelFeeRate * 100)}
            min={5}
            max={50}
            unit={t(locale, "mPolicyUnitPct")}
          />
          <PolicyNumberField
            label={t(locale, "mPolicyNoShowPct")}
            name="noShowFeeRate"
            defaultValue={Math.round(policy.noShowFeeRate * 100)}
            min={5}
            max={50}
            unit={t(locale, "mPolicyUnitPct")}
          />
        </div>
      </div>
      ) : null}
      {error ? <p className="text-[12px] text-giu-danger">{error}</p> : null}
      {saved ? <p className="giu-info-banner">{t(locale, "mSettingsSaved")}</p> : null}
      <button type="submit" disabled={busy} className="giu-btn-primary giu-btn-3d w-full py-3.5">
        {busy ? t(locale, "loading") : t(locale, "mSettingsSave")}
      </button>
    </form>
  );
}
