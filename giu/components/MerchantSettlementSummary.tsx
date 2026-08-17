"use client";

import Link from "next/link";
import { formatMoney } from "@/giu/lib/format";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuMerchant, GiuReservation } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  merchant: GiuMerchant;
  reservations: GiuReservation[];
  panelHref: string;
};

export function MerchantSettlementSummary({ locale, merchant, reservations, panelHref }: Props) {
  const money = (n: number) => formatMoney(n, "kr");
  const paid = reservations.filter((r) => r.paymentStatus === "paid" || r.paymentStatus === "refunded");

  const held = paid
    .filter((r) => r.settlementStatus === "held")
    .reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);
  const released = paid
    .filter((r) => r.settlementStatus === "released")
    .reduce((s, r) => s + (r.totalVnd - r.platformFeeVnd), 0);
  const pendingAccount = paid.filter((r) => r.payoutStatus === "pending_account").length;
  const queued = paid.filter((r) => r.payoutStatus === "queued").length;
  const hasBank = Boolean(merchant.bankName?.trim() && merchant.bankAccount?.trim());

  return (
    <section className="giu-card space-y-3">
      <div>
        <h2 className="text-[17px] font-bold text-giu-ink">{t(locale, "mSettlementTitle")}</h2>
        <p className="mt-0.5 text-[12px] text-giu-muted">{t(locale, "mFeeNote")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[13px]">
        <div className="rounded-[12px] bg-giu-bg px-3 py-2">
          <p className="text-[10px] font-medium text-giu-muted">{t(locale, "mSettleHeld")}</p>
          <p className="font-extrabold text-giu-ink">{money(held)}</p>
          <p className="text-[10px] text-giu-muted">{t(locale, "mSettleHeldHint")}</p>
        </div>
        <div className="rounded-[12px] bg-giu-accent-soft px-3 py-2">
          <p className="text-[10px] font-medium text-giu-primary">{t(locale, "mSettleDone")}</p>
          <p className="font-extrabold text-giu-ink">{money(released)}</p>
        </div>
      </div>

      <dl className="space-y-1.5 text-[12px]">
        <div className="flex justify-between gap-2">
          <dt className="text-giu-muted">{t(locale, "mPayoutQueued")}</dt>
          <dd className="font-bold text-giu-ink">{queued}{t(locale, "mUnits")}</dd>
        </div>
        {pendingAccount > 0 ? (
          <div className="flex justify-between gap-2">
            <dt className="text-giu-muted">{t(locale, "mPayoutPendingAccount")}</dt>
            <dd className="font-bold text-red-600">{pendingAccount}{t(locale, "mUnits")}</dd>
          </div>
        ) : null}
      </dl>

      {!hasBank ? (
        <Link
          href={`${panelHref}?tab=settings`}
          className="giu-btn-primary giu-btn-3d block text-center !py-3 text-[13px]"
        >
          {t(locale, "mRegisterBankCta")}
        </Link>
      ) : (
        <p className="giu-info-banner text-[12px]">
          {merchant.bankName} · {merchant.bankAccount}
        </p>
      )}
    </section>
  );
}
