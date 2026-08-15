import Link from "next/link";
import type { GiuBox, GiuMerchant } from "@/giu/lib/types";
import { getCategoryEmoji } from "@/giu/lib/categories";
import { formatDiscount, formatPickupWindow, formatVnd } from "@/giu/lib/format";

type Props = {
  box: GiuBox;
  merchant: GiuMerchant;
  index?: number;
};

export function BoxCard({ box, merchant, index = 0 }: Props) {
  const discount = formatDiscount(box.originalPriceVnd, box.salePriceVnd);

  return (
    <Link
      href={`/giu/hop/${box.id}`}
      className="giu-feed-item giu-list-row !gap-0 !overflow-hidden !p-0"
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
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[15px] font-bold leading-snug text-giu-ink">{box.title}</p>
          <span className="giu-badge-sale shrink-0">{discount}</span>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-giu-muted">{merchant.name}</p>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <p className="text-[17px] font-extrabold tracking-tight text-giu-ink">
            {formatVnd(box.salePriceVnd)}
          </p>
          <p className="text-right text-[11px] font-medium text-giu-muted">
            {box.quantityLeft}개 · {formatPickupWindow(box.pickupStart, box.pickupEnd)}
          </p>
        </div>
      </div>
    </Link>
  );
}
