"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomerLogoutLink } from "@/giu/components/CustomerLogoutLink";
import { orderStatusLabelKo } from "@/giu/lib/order-status";
import { formatPickupWindowWithDate, formatVnd } from "@/giu/lib/format";
import { hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import { isActiveCustomerOrder, isPastCustomerOrder } from "@/giu/lib/order-status";
import { resolveDisplayReservationStatus } from "@/giu/lib/pickup-policy";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuBox, GiuMerchant, GiuReservation } from "@/giu/lib/types";
import { GiuCustomerNavLink } from "./GiuCustomerNavLink";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";

type Enriched = GiuReservation & { box?: GiuBox | null; merchant?: GiuMerchant | null };
type CustomerFilter = "all" | "active" | "past";

function isActiveReservation(r: GiuReservation): boolean {
  return isActiveCustomerOrder(r);
}

function isPastReservation(r: GiuReservation): boolean {
  return isPastCustomerOrder(r);
}

export function MyReservationsLookup() {
  const { account, loading: authLoading } = useGiuAuth();
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const [list, setList] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CustomerFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, merchantsRes, boxesRes] = await Promise.all([
        fetch("/api/giu/reservations", { credentials: "include" }),
        fetch("/api/giu/merchants"),
        fetch("/api/giu/boxes"),
      ]);
      if (!res.ok) return;
      const data = (await res.json()) as { reservations: GiuReservation[] };
      const merchants = merchantsRes.ok
        ? ((await merchantsRes.json()) as { merchants: GiuMerchant[] }).merchants ?? []
        : [];
      const boxes = boxesRes.ok
        ? ((await boxesRes.json()) as { boxes: GiuBox[] }).boxes ?? []
        : [];
      const mMap = new Map(merchants.map((m) => [m.id, m]));
      const boxMap = new Map(boxes.map((b) => [b.id, b]));
      setList(
        (data.reservations ?? []).map((r) => ({
          ...r,
          box: boxMap.get(r.boxId) ?? null,
          merchant: mMap.get(r.merchantId) ?? null,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "customer") void load();
  }, [account, load]);

  const savedTotal = useMemo(() => {
    const paid = list.filter(
      (r) =>
        r.paymentStatus === "paid" ||
        r.status === "pickup_completed" ||
        r.status === "settlement_completed" ||
        r.paymentStatus === "refunded",
    );
    const retail = paid.reduce((s, r) => {
      const unit = r.box?.originalPriceVnd ?? Math.round(r.totalVnd / Math.max(1, r.quantity));
      return s + unit * r.quantity;
    }, 0);
    const spent = paid.reduce((sum, r) => sum + r.totalVnd, 0);
    return Math.max(0, retail - spent);
  }, [list]);

  const filtered = useMemo(() => {
    return list.filter((r) => {
      if (filter === "active") return isActiveReservation(r);
      if (filter === "past") return isPastReservation(r);
      return true;
    });
  }, [list, filter]);

  function statusLabel(r: Enriched): string {
    const shown = resolveDisplayReservationStatus(r, r.box?.pickupEnd);
    return orderStatusLabelKo(shown);
  }

  function statusClass(r: Enriched): string {
    const shown = resolveDisplayReservationStatus(r, r.box?.pickupEnd);
    if (shown === "not_picked_up" || shown === "no_show_review") return "font-bold text-amber-800";
    if (
      shown === "pickup_waiting" ||
      shown === "payment_completed" ||
      shown === "merchant_confirmed"
    ) {
      return "font-semibold text-giu-primary";
    }
    return "font-semibold text-giu-muted";
  }

  if (authLoading) {
    return <p className="text-[13px] text-giu-muted">{t(locale, "loading")}</p>;
  }

  if (!account) {
    return (
      <div className="giu-card space-y-3 text-center">
        <p className="text-[13px] text-giu-muted">{t(locale, "myCodesLogin")}</p>
        <GiuCustomerNavLink href={`${href(GIU_ROUTES.auth)}?role=customer`} className="giu-btn-primary giu-btn-3d block text-center">
          {t(locale, "loginSignup")}
        </GiuCustomerNavLink>
      </div>
    );
  }

  if (loading) {
    return <p className="text-[13px] text-giu-muted">{t(locale, "loading")}</p>;
  }

  if (list.length === 0) {
    return (
      <div className="space-y-3">
        <div className="giu-card text-center text-[13px] text-giu-muted">
          {t(locale, "noOrders")}{" "}
          <GiuCustomerNavLink href={href(GIU_ROUTES.customer.boxes)} className="font-bold text-giu-primary">
            {t(locale, "findBoxes")}
          </GiuCustomerNavLink>
        </div>
        <CustomerLogoutLink locale={locale} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {savedTotal > 0 ? (
        <p className="text-center text-[14px] font-bold text-giu-primary">
          {t(locale, "impactSaved")} {formatVnd(savedTotal)}
        </p>
      ) : null}

      <div className="giu-card space-y-2.5">
        <p className="text-[15px] font-bold text-giu-ink">{t(locale, "myReservationsTitle")}</p>
        <div className="giu-filter-tabs">
          {(["all", "active", "past"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                hapticSelect();
                setFilter(f);
              }}
              className={`giu-filter-tab ${filter === f ? "is-active" : ""}`}
            >
              {t(
                locale,
                f === "all" ? "mFilterAll" : f === "active" ? "myFilterActive" : "myFilterPast",
              )}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="text-[13px] text-giu-muted">{t(locale, "mFilterEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r, i) => (
              <li key={r.id} className="giu-feed-item" style={{ animationDelay: `${i * 40}ms` }}>
                <GiuCustomerNavLink href={href(GIU_ROUTES.customer.reservation(r.id))} className="giu-list-row giu-tap block">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[15px] font-bold text-giu-ink">
                        {r.merchant?.name ?? r.box?.title ?? t(locale, "myCodes")}
                      </p>
                      <span className={`shrink-0 text-[11px] ${statusClass(r)}`}>{statusLabel(r)}</span>
                    </div>
                    {r.box ? (
                      <p className="truncate text-[12px] text-giu-muted">
                        {r.box.title} · {formatPickupWindowWithDate(r.box.pickupStart, r.box.pickupEnd)}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[12px] font-semibold text-giu-ink">{formatVnd(r.totalVnd)}</p>
                  </div>
                </GiuCustomerNavLink>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CustomerLogoutLink locale={locale} />
    </div>
  );
}
