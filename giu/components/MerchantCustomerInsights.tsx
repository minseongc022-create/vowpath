"use client";

import { useMemo } from "react";
import { hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { listMerchantCustomers } from "@/giu/lib/merchant-customer-history";
import { computeMerchantCustomerInsights } from "@/giu/lib/merchant-insights";
import { formatMoney } from "@/giu/lib/format";
import type { GiuReservation } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  merchantId: string;
  reservations: GiuReservation[];
  onSelectCustomer: (customerId: string) => void;
};

export function MerchantCustomerInsights({
  locale,
  merchantId,
  reservations,
  onSelectCustomer,
}: Props) {
  const insights = useMemo(
    () => computeMerchantCustomerInsights(reservations, merchantId),
    [reservations, merchantId],
  );
  const customers = useMemo(
    () => listMerchantCustomers(reservations, merchantId),
    [reservations, merchantId],
  );
  const money = (n: number) => formatMoney(n, "kr");

  return (
    <section className="giu-card space-y-3">
      <div>
        <h2 className="text-[17px] font-bold text-giu-ink">{t(locale, "mInsightsTitle")}</h2>
        <p className="mt-0.5 text-[12px] leading-relaxed text-giu-muted">{t(locale, "mInsightsSub")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[12px] bg-giu-bg px-3 py-2.5 ring-1 ring-giu-border">
          <p className="text-[10px] font-bold text-giu-muted">{t(locale, "mInsightsNew")}</p>
          <p className="text-[20px] font-extrabold text-giu-ink">{insights.giuCustomers}</p>
        </div>
        <div className="rounded-[12px] bg-giu-primary-soft px-3 py-2.5">
          <p className="text-[10px] font-bold text-giu-primary">{t(locale, "mInsightsRepeat")}</p>
          <p className="text-[20px] font-extrabold text-giu-ink">{insights.repeatCustomers}</p>
        </div>
        <div className="rounded-[12px] bg-giu-bg px-3 py-2.5 ring-1 ring-giu-border">
          <p className="text-[10px] font-bold text-giu-muted">{t(locale, "mInsightsPickups")}</p>
          <p className="text-[20px] font-extrabold text-giu-ink">{insights.completedPickups}</p>
        </div>
        <div className="rounded-[12px] bg-giu-accent-soft px-3 py-2.5">
          <p className="text-[10px] font-bold text-giu-primary">{t(locale, "mInsightsSales")}</p>
          <p className="text-[15px] font-extrabold leading-tight text-giu-ink">
            {money(insights.totalSalesVnd)}
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <div>
          <h3 className="text-[14px] font-bold text-giu-ink">{t(locale, "mCustListTitle")}</h3>
          <p className="text-[11px] text-giu-muted">{t(locale, "mCustListSub")}</p>
        </div>
        {customers.length === 0 ? (
          <p className="text-[13px] text-giu-muted">{t(locale, "mCustListEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {customers.map((c) => (
              <li key={c.customerId}>
                <button
                  type="button"
                  onClick={() => {
                    hapticSelect();
                    onSelectCustomer(c.customerId);
                  }}
                  className="giu-card-flat flex w-full items-center justify-between gap-3 p-3 text-left ring-1 ring-giu-border transition active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-giu-ink">{c.customerName}</p>
                    <p className="text-[12px] text-giu-muted">{c.customerPhone}</p>
                    <p className="mt-1 text-[11px] text-giu-muted">
                      {t(locale, "mCustStatOrders")} {c.orderCount} · {t(locale, "mCustStatPickups")}{" "}
                      {c.completedCount}
                      {c.refundedCount > 0
                        ? ` · ${t(locale, "mCustStatRefunds")} ${c.refundedCount}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-giu-primary">
                    {t(locale, "mCustDetailOpen")} →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
