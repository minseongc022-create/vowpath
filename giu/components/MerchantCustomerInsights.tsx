"use client";

import { useMemo } from "react";
import { computeMerchantCustomerInsights } from "@/giu/lib/merchant-insights";
import { formatMoney } from "@/giu/lib/format";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuReservation } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  merchantId: string;
  reservations: GiuReservation[];
};

export function MerchantCustomerInsights({ locale, merchantId, reservations }: Props) {
  const insights = useMemo(
    () => computeMerchantCustomerInsights(reservations, merchantId),
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
    </section>
  );
}
