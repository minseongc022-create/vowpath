"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GIU_ROUTES } from "@/giu/lib/routes";
import {
  formatPickupWindow,
  formatReservationStatus,
  formatVnd,
} from "@/giu/lib/format";
import type { GiuBox, GiuMerchant, GiuReservation } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";
import { useGiuLocale } from "./GiuLocaleProvider";

type Enriched = GiuReservation & { box?: GiuBox | null; merchant?: GiuMerchant | null };

export function MyReservationsLookup() {
  const { account, loading: authLoading } = useGiuAuth();
  const { tt } = useGiuLocale();
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

  if (authLoading) {
    return <p className="text-[13px] text-giu-muted">{tt("loading")}</p>;
  }

  if (!account) {
    return (
      <div className="giu-card space-y-3 text-center">
        <p className="text-[13px] text-giu-muted">{tt("myCodesLogin")}</p>
        <Link href={`${GIU_ROUTES.auth}?role=customer`} className="giu-btn-primary block text-center">
          {tt("loginSignup")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-[13px] text-giu-muted">{tt("loading")}</p>;
  }

  if (list.length === 0) {
    return (
      <div className="giu-card text-center text-[13px] text-giu-muted">
        {tt("noOrders")}{" "}
        <Link href="/giu/hop" className="font-bold text-giu-primary">
          {tt("findBoxes")}
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {list.map((r, i) => (
        <li key={r.id} className="giu-feed-item" style={{ animationDelay: `${i * 40}ms` }}>
          <Link href={`/giu/dat/${r.id}`} className="giu-list-row block">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[20px] font-extrabold tracking-wider text-giu-primary">
                  {r.code}
                </p>
                <span className="text-[11px] font-semibold text-giu-muted">
                  {formatReservationStatus(r.status)}
                </span>
              </div>
              {r.merchant ? (
                <p className="mt-0.5 truncate text-[13px] font-bold text-giu-ink">{r.merchant.name}</p>
              ) : null}
              {r.box ? (
                <p className="truncate text-[12px] text-giu-muted">
                  {r.box.title} · {formatPickupWindow(r.box.pickupStart, r.box.pickupEnd)}
                </p>
              ) : null}
              <p className="mt-1 text-[12px] font-semibold text-giu-ink">{formatVnd(r.totalVnd)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
