import Link from "next/link";
import type { GiuMerchant } from "@/giu/lib/types";
import { getCategoryEmoji, getCategoryLabel } from "@/giu/lib/categories";
import { getDistrictLabel } from "@/giu/lib/districts";

/** Customer-facing merchant summary — browse only, no panel deep-link. */
export function MerchantCard({ merchant }: { merchant: GiuMerchant }) {
  return (
    <Link href={`/giu/hop?q=${encodeURIComponent(merchant.name)}`} className="giu-list-row shadow-giu-sm block">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-giu-bg text-2xl">
        {getCategoryEmoji(merchant.category)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-giu-ink">{merchant.name}</p>
        <p className="text-sm text-giu-muted">
          {getCategoryLabel(merchant.category)} · {getDistrictLabel(merchant.district)}
        </p>
        <p className="mt-1 truncate text-xs text-giu-muted">{merchant.address}</p>
      </div>
    </Link>
  );
}
