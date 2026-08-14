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
    <Link
      href={`/giu/hop/${box.id}`}
      className="group block rounded-2xl border border-giu-border bg-white p-5 shadow-sm transition hover:border-giu-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getCategoryEmoji(box.category)}</span>
          <div>
            <p className="font-semibold text-giu-ink group-hover:text-giu-primary">{box.title}</p>
            <p className="text-sm text-giu-muted">{merchant.name}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-giu-accent/10 px-2.5 py-1 text-xs font-bold text-giu-accent">
          {discount}
        </span>
      </div>

      {box.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-giu-muted">{box.description}</p>
      ) : null}

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-giu-primary">{formatVnd(box.salePriceVnd)}</p>
          <p className="text-xs text-giu-muted line-through">{formatVnd(box.originalPriceVnd)}</p>
        </div>
        <div className="text-right text-xs text-giu-muted">
          <p>Còn {box.quantityLeft} hộp</p>
          <p>{formatPickupWindow(box.pickupStart, box.pickupEnd)}</p>
        </div>
      </div>
    </Link>
  );
}
