"use client";

import { useState } from "react";
import { GiuBottomSheet } from "@/giu/components/GiuBottomSheet";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuMerchant } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";

type Props = {
  locale: GiuLocale;
  open: boolean;
  merchant: GiuMerchant;
  onClose: () => void;
  onSaved?: (merchant: GiuMerchant) => void;
};

export function MerchantBankRegisterSheet({ locale, open, merchant, onClose, onSaved }: Props) {
  const { refresh } = useGiuAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/giu/merchants/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bankName: fd.get("bankName"),
          bankAccount: fd.get("bankAccount"),
          bankHolder: fd.get("bankHolder") || merchant.name,
        }),
      });
      const data = (await res.json()) as { error?: string; merchant?: GiuMerchant };
      if (!res.ok) {
        setError(data.error ?? t(locale, "mLoadError"));
        return;
      }
      hapticConfirm();
      if (data.merchant) onSaved?.(data.merchant);
      await refresh();
      onClose();
    } catch {
      setError(t(locale, "mLoadError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <GiuBottomSheet
      open={open}
      onClose={() => {
        hapticSelect();
        onClose();
      }}
      dismissLabel={t(locale, "mCloseSheet")}
      ariaLabelledBy="giu-bank-sheet-title"
    >
      <form onSubmit={submit} className="giu-panel-enter space-y-3">
        <div>
          <h3 id="giu-bank-sheet-title" className="text-[17px] font-bold text-giu-ink">
            {t(locale, "mRegisterBankTitle")}
          </h3>
          <p className="mt-1 text-[12px] leading-snug text-giu-muted">{t(locale, "mBankHint")}</p>
        </div>
        <div>
          <label className="giu-label">{t(locale, "mBankName")}</label>
          <input
            name="bankName"
            required
            defaultValue={merchant.bankName ?? ""}
            className="giu-input"
            placeholder="국민은행"
          />
        </div>
        <div>
          <label className="giu-label">{t(locale, "mBankAccount")}</label>
          <input
            name="bankAccount"
            required
            inputMode="numeric"
            defaultValue={merchant.bankAccount ?? ""}
            className="giu-input"
            placeholder="123456-01-123456"
          />
        </div>
        <div>
          <label className="giu-label">{t(locale, "mBankHolder")}</label>
          <input
            name="bankHolder"
            defaultValue={merchant.bankHolder ?? merchant.name}
            className="giu-input"
            placeholder={merchant.name}
          />
        </div>
        {error ? <p className="text-[12px] text-giu-danger">{error}</p> : null}
        <button type="submit" disabled={busy} className="giu-btn-primary giu-btn-3d w-full !py-3.5 text-[15px]">
          {busy ? t(locale, "loading") : t(locale, "mRegisterBankSave")}
        </button>
        <button type="button" onClick={onClose} className="giu-btn-secondary giu-btn-3d w-full !py-3 text-[14px]">
          {t(locale, "mCloseNo")}
        </button>
      </form>
    </GiuBottomSheet>
  );
}
