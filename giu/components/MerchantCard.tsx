import Link from "next/link";
import type { GiuMerchant } from "@/giu/lib/types";
import { getCategoryEmoji, getCategoryLabel } from "@/giu/lib/categories";
import { getDistrictLabel } from "@/giu/lib/districts";

export function MerchantCard({ merchant }: { merchant: GiuMerchant }) {
  return (
    <Link
      href={`/giu/cua-hang/panel?phone=${encodeURIComponent(merchant.phone)}`}
      className="giu-list-row shadow-giu-sm block"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-giu-bg text-2xl">
        {getCategoryEmoji(merchant.category)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-giu-ink">{merchant.name}</p>
        <p className="text-sm text-giu-muted">
          {getCategoryLabel(merchant.category)} · {getDistrictLabel(merchant.district)}
        </p>
        <p className="mt-1 text-xs text-giu-muted">
          {merchant.verified ? (
            <span className="text-giu-primary">✓ Verified</span>
          ) : (
            <span className="text-giu-gold">인증 대기</span>
          )}
          {" · "}
          {merchant.rescuedBoxes}박스
        </p>
      </div>
    </Link>
  );
}
