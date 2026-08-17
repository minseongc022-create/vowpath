"use client";

import { useState } from "react";
import { merchantCategories } from "@/giu/lib/categories";
import { merchantDistricts } from "@/giu/lib/districts";
import { hapticConfirm } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuMerchant } from "@/giu/lib/types";
import { GiuConfirmSheet } from "@/giu/components/GiuConfirmSheet";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuHref } from "./GiuNavProvider";

type Props = {
  locale: GiuLocale;
  merchant: GiuMerchant;
  onSaved?: (merchant: GiuMerchant) => void;
};

export function MerchantSettingsForm({ locale, merchant, onSaved }: Props) {
  const { refresh, logout } = useGiuAuth();
  const href = useGiuHref();
  const categories = merchantCategories();
  const districts = merchantDistricts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

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
    <form onSubmit={submit} className="giu-card space-y-3">
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
          <input name="bankName" defaultValue={merchant.bankName ?? ""} className="giu-input giu-input-hint" placeholder="국민은행" />
        </div>
        <div>
          <label className="giu-label">{t(locale, "mBankAccount")}</label>
          <input name="bankAccount" inputMode="numeric" defaultValue={merchant.bankAccount ?? ""} className="giu-input giu-input-hint" placeholder="123456-01-123456" />
        </div>
        <div>
          <label className="giu-label">{t(locale, "mBankHolder")}</label>
          <input name="bankHolder" defaultValue={merchant.bankHolder ?? ""} className="giu-input giu-input-hint" placeholder={merchant.name} />
        </div>
      </div>
      {error ? <p className="text-[12px] text-giu-danger">{error}</p> : null}
      {saved ? <p className="giu-info-banner">{t(locale, "mSettingsSaved")}</p> : null}
      <button type="submit" disabled={busy} className="giu-btn-primary giu-btn-3d w-full py-3.5">
        {busy ? t(locale, "loading") : t(locale, "mSettingsSave")}
      </button>
      <button
        type="button"
        onClick={() => setLogoutOpen(true)}
        className="giu-btn-secondary giu-btn-3d w-full !py-3 text-[14px]"
      >
        {t(locale, "logout")}
      </button>

      <GiuConfirmSheet
        open={logoutOpen}
        title={t(locale, "logout")}
        message={t(locale, "mLogoutConfirm")}
        confirmLabel={t(locale, "logout")}
        cancelLabel={t(locale, "mCloseNo")}
        onConfirm={() =>
          void logout().then(() => {
            window.location.href = `${href(GIU_ROUTES.auth)}?role=merchant`;
          })
        }
        onCancel={() => setLogoutOpen(false)}
      />
    </form>
  );
}
