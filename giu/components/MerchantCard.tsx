import Link from "next/link";
import type { GiuMerchant } from "@/giu/lib/types";
import { getCategoryEmoji, getCategoryLabel } from "@/giu/lib/categories";
import { getDistrictLabel } from "@/giu/lib/districts";

export function MerchantCard({ merchant }: { merchant: GiuMerchant }) {
  return (
    <Link
      href={`/giu/cua-hang/panel?phone=${encodeURIComponent(merchant.phone)}`}
      className="block rounded-2xl border border-giu-border bg-white p-5 shadow-sm transition hover:border-giu-primary/30"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getCategoryEmoji(merchant.category)}</span>
        <div>
          <p className="font-semibold text-giu-ink">{merchant.name}</p>
          <p className="text-sm text-giu-muted">
            {getCategoryLabel(merchant.category)} · {getDistrictLabel(merchant.district)}
          </p>
          <p className="mt-1 text-xs text-giu-muted">{merchant.address}</p>
          <p className="mt-2 text-xs">
            {merchant.verified ? (
              <span className="text-giu-primary">✓ Đã xác minh</span>
            ) : (
              <span className="text-amber-700">Chờ xác minh</span>
            )}
            {" · "}
            {merchant.rescuedBoxes} hộp đã giải cứu
          </p>
        </div>
      </div>
    </Link>
  );
}
