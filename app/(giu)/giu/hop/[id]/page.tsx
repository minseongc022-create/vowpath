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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/giu/hop" className="text-sm font-medium text-giu-primary">
        ← Quay lại danh sách
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <span className="text-3xl">{getCategoryEmoji(box.category)}</span>
          <h1 className="mt-3 text-3xl font-bold text-giu-ink">{box.title}</h1>
          <p className="mt-2 text-lg text-giu-muted">{merchant.name}</p>
          <p className="text-sm text-giu-muted">
            {getCategoryLabel(box.category)} · {getDistrictLabel(merchant.district)}
          </p>
          <p className="mt-1 text-sm">{merchant.address}</p>

          {box.description ? (
            <p className="mt-4 text-giu-muted">{box.description}</p>
          ) : null}

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-giu-primary">
              {formatVnd(box.salePriceVnd)}
            </span>
            <span className="text-lg text-giu-muted line-through">
              {formatVnd(box.originalPriceVnd)}
            </span>
            <span className="rounded-full bg-giu-accent/10 px-2 py-0.5 text-sm font-bold text-giu-accent">
              {formatDiscount(box.originalPriceVnd, box.salePriceVnd)}
            </span>
          </div>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between border-b border-giu-border py-2">
              <dt className="text-giu-muted">Ngày lấy</dt>
              <dd className="font-medium">{formatPickupDate(box.pickupStart)}</dd>
            </div>
            <div className="flex justify-between border-b border-giu-border py-2">
              <dt className="text-giu-muted">Khung giờ</dt>
              <dd className="font-medium">{formatPickupWindow(box.pickupStart, box.pickupEnd)}</dd>
            </div>
            <div className="flex justify-between border-b border-giu-border py-2">
              <dt className="text-giu-muted">Còn lại</dt>
              <dd className="font-medium">{box.quantityLeft} hộp</dd>
            </div>
          </dl>
        </div>

        <div>
          {soldOut ? (
            <div className="rounded-2xl border border-giu-border bg-giu-surface p-6 text-center">
              <p className="font-semibold text-giu-ink">Hộp đã hết</p>
              <p className="mt-2 text-sm text-giu-muted">Quay lại sau 19h hoặc chọn hộp khác.</p>
              <Link
                href="/giu/hop"
                className="mt-4 inline-block rounded-xl bg-giu-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Xem hộp khác
              </Link>
            </div>
          ) : (
            <ReserveForm boxId={box.id} salePriceVnd={box.salePriceVnd} />
          )}
        </div>
      </div>
    </div>
  );
}
