"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CO2_KG_PER_BOX } from "@/giu/lib/box-ux";
import { formatReservationStatusLocale } from "@/giu/lib/box-ux";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import { t } from "@/giu/lib/i18n";
import { GIU_ROUTES } from "@/giu/lib/routes";
import type { GiuBox, GiuMerchant, GiuReservation } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";
import { useGiuHref } from "./GiuNavProvider";

type Enriched = GiuReservation & { box?: GiuBox | null; merchant?: GiuMerchant | null };

export function MyReservationsLookup() {
  const { account, loading: authLoading } = useGiuAuth();
  const { locale } = useGiuLocale();
  const href = useGiuHref();
  const [list, setList] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(false);

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
      const merchantMap = new Map(merchants.map((m) => [m.id, m]));
      const boxMap = new Map(boxes.map((b) => [b.id, b]));
      setList(
        (data.reservations ?? []).map((r) => ({
          ...r,
          box: boxMap.get(r.boxId) ?? null,
          merchant: merchantMap.get(r.merchantId) ?? null,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "customer") void load();
  }, [account, load]);

  const impact = useMemo(() => {
    const paid = list.filter((r) => r.paymentStatus === "paid" || r.paymentStatus === "refunded");
    const boxes = paid.reduce((s, r) => s + r.quantity, 0);
    const spent = paid.reduce((s, r) => s + r.totalVnd, 0);
    // Approx retail saved vs sale (~2× on surprise bags)
    const saved = Math.round(spent * 0.9);
    const co2 = boxes * CO2_KG_PER_BOX;
    return { boxes, saved, co2 };
  }, [list]);

  if (authLoading) {
    return <p className="text-[13px] text-giu-muted">{t(locale, "loading")}</p>;
  }

  if (!account) {
    return (
      <div className="giu-card space-y-3 text-center">
        <p className="text-[13px] text-giu-muted">{t(locale, "myCodesLogin")}</p>
        <Link href={`${href(GIU_ROUTES.auth)}?role=customer`} className="giu-btn-primary block text-center">
          {t(locale, "loginSignup")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-[13px] text-giu-muted">{t(locale, "loading")}</p>;
  }

  if (list.length === 0) {
    return (
      <div className="giu-card text-center text-[13px] text-giu-muted">
        {t(locale, "noOrders")}{" "}
        <Link href={href(GIU_ROUTES.customer.boxes)} className="font-bold text-giu-primary">
          {t(locale, "findBoxes")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="giu-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-giu-muted">
          {t(locale, "impactTitle")}
        </p>
        <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-giu-bg px-2 py-2.5">
            <p className="text-[18px] font-extrabold text-giu-ink">{impact.boxes}</p>
            <p className="text-[10px] font-semibold text-giu-muted">{t(locale, "impactBoxes")}</p>
          </div>
          <div className="rounded-xl bg-giu-bg px-2 py-2.5">
            <p className="text-[18px] font-extrabold text-giu-ink">{impact.co2.toFixed(1)}</p>
            <p className="text-[10px] font-semibold text-giu-muted">
              {t(locale, "impactCo2")} kg
            </p>
          </div>
          <div className="rounded-xl bg-giu-bg px-2 py-2.5">
            <p className="text-[14px] font-extrabold leading-tight text-giu-accent">
              {formatVnd(impact.saved)}
            </p>
            <p className="text-[10px] font-semibold text-giu-muted">{t(locale, "impactSaved")}</p>
          </div>
        </div>
      </div>

      <ul className="space-y-2.5">
        {list.map((r, i) => (
          <li key={r.id} className="giu-feed-item" style={{ animationDelay: `${i * 40}ms` }}>
            <Link href={href(GIU_ROUTES.customer.reservation(r.id))} className="giu-list-row block">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[15px] font-bold text-giu-ink">
                    {r.merchant?.name ?? r.box?.title ?? t(locale, "myCodes")}
                  </p>
                  <span className="text-[11px] font-semibold text-giu-muted">
                    {formatReservationStatusLocale(r.status, locale)}
                  </span>
                </div>
                {r.box ? (
                  <p className="truncate text-[12px] text-giu-muted">
                    {r.box.title} · {formatPickupWindow(r.box.pickupStart, r.box.pickupEnd)}
                  </p>
                ) : null}
                <p className="mt-1 text-[12px] font-semibold text-giu-ink">
                  {formatVnd(r.totalVnd)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
