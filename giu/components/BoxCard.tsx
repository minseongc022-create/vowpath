"use client";

import Link from "next/link";
import type { GiuBox, GiuMerchant } from "@/giu/lib/types";
import { getCategoryEmoji } from "@/giu/lib/categories";
import { formatDiscount, formatPickupWindow, formatVnd } from "@/giu/lib/format";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { useGiuHref } from "./GiuNavProvider";

type Props = {
  box: GiuBox;
  merchant: GiuMerchant;
  index?: number;
};

export function BoxCard({ box, merchant, index = 0 }: Props) {
  const href = useGiuHref();
  const discount = formatDiscount(box.originalPriceVnd, box.salePriceVnd);

  return (
    <Link
      href={href(GIU_ROUTES.customer.box(box.id))}
      className="giu-feed-item giu-list-row giu-tap !gap-0 !overflow-hidden !p-0"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="giu-photo h-[92px] w-[92px] shrink-0">
        {box.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={box.imageUrl} alt="" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl">
            {getCategoryEmoji(box.category)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-[14px] font-extrabold leading-snug text-giu-ink">
            {box.title}
          </p>
          <span className="giu-badge-sale shrink-0">{discount}</span>
        </div>
        <p className="truncate text-[12px] font-medium text-giu-muted">{merchant.name}</p>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[15px] font-extrabold text-giu-ink">{formatVnd(box.salePriceVnd)}</p>
          <p className="text-[11px] font-semibold text-giu-muted">
            {formatPickupWindow(box.pickupStart, box.pickupEnd)} · {box.quantityLeft}개
          </p>
        </div>
      </div>
    </Link>
  );
}
