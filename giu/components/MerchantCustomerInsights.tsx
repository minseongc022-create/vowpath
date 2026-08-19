"use client";

import { useMemo } from "react";
import { formatMoney } from "@/giu/lib/format";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuBox, GiuReservation } from "@/giu/lib/types";

type Props = {
  locale: GiuLocale;
  merchantId: string;
  reservations: GiuReservation[];
  boxMap: Map<string, GiuBox>;
};

type DayGroup = {
  dayKey: string;
  label: string;
  items: Array<{
    id: string;
    customerName: string;
    productTitle: string;
    netVnd: number;
    at: string;
  }>;
  dayTotalVnd: number;
};

function isDeliveredOrder(r: GiuReservation): boolean {
  return (
    r.status === "da_lay" &&
    r.paymentStatus === "paid" &&
    r.settlementStatus === "released"
  );
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MerchantCustomerInsights({
  locale,
  merchantId,
  reservations,
  boxMap,
}: Props) {
  const money = (n: number) => formatMoney(n, "kr");

  const { totalNetVnd, dayGroups } = useMemo(() => {
    const delivered = reservations
      .filter((r) => r.merchantId === merchantId && isDeliveredOrder(r))
      .sort((a, b) => (b.settledAt ?? b.createdAt).localeCompare(a.settledAt ?? a.createdAt));

    const map = new Map<string, DayGroup>();
    let totalNetVnd = 0;

    for (const r of delivered) {
      const at = r.settledAt ?? r.createdAt;
      const key = dayKey(at);
      const net = r.totalVnd - r.platformFeeVnd;
      totalNetVnd += net;
      const box = boxMap.get(r.boxId);
      const row = map.get(key) ?? {
        dayKey: key,
        label: dayLabel(at),
        items: [],
        dayTotalVnd: 0,
      };
      row.items.push({
        id: r.id,
        customerName: r.customerName,
        productTitle: box?.title ?? t(locale, "mOrderProduct"),
        netVnd: net,
        at,
      });
      row.dayTotalVnd += net;
      map.set(key, row);
    }

    const dayGroups = [...map.values()].sort((a, b) => b.dayKey.localeCompare(a.dayKey));
    return { totalNetVnd, dayGroups };
  }, [boxMap, locale, merchantId, reservations]);

  return (
    <section className="giu-card space-y-3">
      <div>
        <h2 className="text-[17px] font-bold text-giu-ink">{t(locale, "mInsightsTitle")}</h2>
        <p className="mt-0.5 text-[12px] leading-relaxed text-giu-muted">{t(locale, "mInsightsSubSimple")}</p>
      </div>

      <div className="rounded-[14px] bg-giu-accent-soft px-4 py-3">
        <p className="text-[11px] font-bold text-giu-primary">{t(locale, "mInsightsSalesOut")}</p>
        <p className="text-[22px] font-extrabold text-giu-ink">{money(totalNetVnd)}</p>
      </div>

      {dayGroups.length === 0 ? (
        <p className="text-[13px] text-giu-muted">{t(locale, "mCustFeedEmpty")}</p>
      ) : (
        <ul className="space-y-4">
          {dayGroups.map((day) => (
            <li key={day.dayKey}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="text-[13px] font-bold text-giu-ink">{day.label}</h3>
                <p className="text-[12px] font-semibold text-giu-primary">{money(day.dayTotalVnd)}</p>
              </div>
              <ul className="space-y-1.5">
                {day.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-[12px] bg-giu-bg px-3 py-2.5 ring-1 ring-giu-border"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-giu-ink">{item.customerName}</p>
                      <p className="truncate text-[12px] text-giu-muted">{item.productTitle}</p>
                    </div>
                    <p className="shrink-0 text-[13px] font-bold text-giu-ink">{money(item.netVnd)}</p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
