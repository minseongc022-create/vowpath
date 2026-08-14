import Link from "next/link";
import type { GiuBox, GiuMerchant } from "@/giu/lib/types";
import { getCategoryEmoji } from "@/giu/lib/categories";
import { formatDiscount, formatPickupWindow, formatVnd } from "@/giu/lib/format";

type Props = {
  box: GiuBox;
  merchant: GiuMerchant;
};

export function BoxCard({ box, merchant }: Props) {
  const discount = formatDiscount(box.originalPriceVnd, box.salePriceVnd);

  return (
    <Link href={`/giu/hop/${box.id}`} className="giu-list-row shadow-giu-sm block">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-giu-bg text-2xl">
        {getCategoryEmoji(box.category)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold text-giu-ink">{box.title}</p>
          <span className="giu-badge-sale shrink-0">{discount}</span>
        </div>
        <p className="mt-0.5 truncate text-sm text-giu-muted">{merchant.name}</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-lg font-bold text-giu-ink">{formatVnd(box.salePriceVnd)}</p>
          <p className="text-right text-xs text-giu-muted">
            남은 {box.quantityLeft}개 · {formatPickupWindow(box.pickupStart, box.pickupEnd)}
          </p>
        </div>
      </div>
    </Link>
  );
}
