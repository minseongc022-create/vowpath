"use client";

import Link from "next/link";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import type { GiuBox, GiuMerchant } from "@/giu/lib/types";
import { getDistrictLabel } from "@/giu/lib/districts";

type Item = { box: GiuBox; merchant: GiuMerchant };

export function MapBrowse({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return <p className="text-[13px] text-giu-muted">지도에 표시할 DEAL이 없어요.</p>;
  }

  // Group by district for a compressed "map" without API keys
  const byDistrict = new Map<string, Item[]>();
  for (const item of items) {
    const key = item.merchant.district;
    const list = byDistrict.get(key) ?? [];
    list.push(item);
    byDistrict.set(key, list);
  }

  return (
    <div className="space-y-3">
      {[...byDistrict.entries()].map(([district, list]) => (
        <section key={district} className="giu-card space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="giu-map-pin">{list.length}</span>
            <h3 className="text-[14px] font-extrabold text-giu-ink">{getDistrictLabel(district as never)}</h3>
          </div>
          <ul className="space-y-2">
            {list.map(({ box, merchant }) => {
              const open = box.status === "mo" && box.quantityLeft > 0;
              return (
                <li key={box.id}>
                  <Link
                    href={`/giu/hop/${box.id}`}
                    className={`block rounded-[14px] px-3 py-2.5 ring-1 ring-giu-border ${
                      open ? "bg-giu-accent-soft/60" : "bg-giu-bg opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-giu-ink">{box.title}</p>
                        <p className="truncate text-[11px] text-giu-muted">{merchant.name}</p>
                        <p className="mt-0.5 text-[11px] text-giu-muted">
                          {formatPickupWindow(box.pickupStart, box.pickupEnd)}
                          {open ? "" : " · 매진"}
                        </p>
                      </div>
                      <p className="shrink-0 text-[13px] font-extrabold text-giu-ink">
                        {formatVnd(box.salePriceVnd)}
                      </p>
                    </div>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-giu-muted">
                          {merchant.address}
                        </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
