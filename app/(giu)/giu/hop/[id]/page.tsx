import Link from "next/link";
import { notFound } from "next/navigation";
import { ReserveForm } from "@/giu/components/ReserveForm";
import { getCategoryEmoji, getCategoryLabel } from "@/giu/lib/categories";
import { getDistrictLabel } from "@/giu/lib/districts";
import {
  formatDiscount,
  formatPickupDate,
  formatPickupWindow,
  formatVnd,
} from "@/giu/lib/format";
import { getBox, getMerchant } from "@/giu/lib/store";

type Props = { params: Promise<{ id: string }> };

export default async function GiuBoxDetailPage({ params }: Props) {
  const { id } = await params;
  const box = await getBox(id);
  if (!box) notFound();
  const merchant = await getMerchant(box.merchantId);
  if (!merchant) notFound();

  const soldOut = box.status !== "mo" || box.quantityLeft <= 0;

  return (
    <div className="giu-page space-y-5">
      <Link href="/giu/hop" className="inline-flex text-sm font-semibold text-giu-primary">
        ← Quay lại
      </Link>

      <div className="giu-card space-y-4">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-giu-bg text-3xl">
            {getCategoryEmoji(box.category)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-snug text-giu-ink">{box.title}</h1>
            <p className="mt-1 text-sm text-giu-muted">{merchant.name}</p>
            <p className="text-xs text-giu-muted">
              {getCategoryLabel(box.category)} · {getDistrictLabel(merchant.district)}
            </p>
          </div>
        </div>

        {box.description ? <p className="text-sm leading-relaxed text-giu-muted">{box.description}</p> : null}

        <div className="flex items-end gap-3">
          <p className="text-3xl font-bold text-giu-ink">{formatVnd(box.salePriceVnd)}</p>
          <p className="text-sm text-giu-muted line-through">{formatVnd(box.originalPriceVnd)}</p>
          <span className="giu-badge-sale">{formatDiscount(box.originalPriceVnd, box.salePriceVnd)}</span>
        </div>

        {box.freshnessNote ? (
          <div className="giu-info-banner text-sm">{box.freshnessNote}</div>
        ) : null}

        <div className="space-y-0 text-sm">
          {[
            ["Ngày lấy", formatPickupDate(box.pickupStart)],
            ["Khung giờ", formatPickupWindow(box.pickupStart, box.pickupEnd)],
            ["Còn lại", `${box.quantityLeft} hộp`],
            ["Địa chỉ", merchant.address],
          ].map(([label, value], i) => (
            <div key={label} className={`flex justify-between py-3 ${i > 0 ? "border-t border-giu-border" : ""}`}>
              <span className="text-giu-muted">{label}</span>
              <span className="max-w-[60%] text-right font-medium text-giu-ink">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {soldOut ? (
        <div className="giu-card text-center">
          <p className="font-semibold text-giu-ink">Hộp đã hết</p>
          <p className="mt-2 text-sm text-giu-muted">Quay lại sau 19h hoặc chọn hộp khác.</p>
          <Link href="/giu/hop" className="giu-btn-primary mt-4 block text-center">
            Xem hộp khác
          </Link>
        </div>
      ) : (
        <ReserveForm boxId={box.id} salePriceVnd={box.salePriceVnd} />
      )}
    </div>
  );
}
