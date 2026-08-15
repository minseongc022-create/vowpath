import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/giu/components/FavoriteButton";
import { MapEmbed } from "@/giu/components/MapEmbed";
import { ReserveForm } from "@/giu/components/ReserveForm";
import { getCategoryLabel } from "@/giu/lib/categories";
import { getDistrictLabel } from "@/giu/lib/districts";
import {
  formatDiscount,
  formatPickupDate,
  formatPickupWindow,
  formatVnd,
} from "@/giu/lib/format";
import { resolveGiuPaymentBackend } from "@/giu/lib/payments";
import { googleMapsSearchUrl, zaloChatUrl } from "@/giu/lib/links";
import { getBox, getMerchant } from "@/giu/lib/store";

type Props = { params: Promise<{ id: string }> };

export default async function GiuBoxDetailPage({ params }: Props) {
  const { id } = await params;
  const box = await getBox(id);
  if (!box) notFound();
  const merchant = await getMerchant(box.merchantId);
  if (!merchant) notFound();

  const soldOut = box.status !== "mo" || box.quantityLeft <= 0;
  const checkoutBackend = resolveGiuPaymentBackend();
  const mapsUrl = googleMapsSearchUrl(merchant.address);
  const zaloUrl = merchant.zalo ? zaloChatUrl(merchant.zalo) : null;

  return (
    <div className="giu-page !pt-0 space-y-3">
      <div className="flex items-center justify-between gap-2 py-2">
        <Link href="/giu/hop" className="text-[13px] font-bold text-giu-primary">
          ← 목록
        </Link>
        <FavoriteButton merchantId={merchant.id} merchantName={merchant.name} />
      </div>

      <div className="giu-photo aspect-[16/10] overflow-hidden rounded-[20px] ring-1 ring-giu-border">
        {box.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={box.imageUrl} alt={box.title} />
        ) : (
          <div className="flex h-full items-end bg-gradient-to-br from-giu-primary-soft to-giu-accent-soft p-5">
            <p className="text-2xl font-extrabold text-giu-ink">{box.title}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 px-0.5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[22px] font-extrabold leading-snug tracking-tight text-giu-ink">
              {box.title}
            </h1>
            <span className="giu-badge-sale mt-1 shrink-0">
              {formatDiscount(box.originalPriceVnd, box.salePriceVnd)}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-giu-muted">
            {merchant.name} · {getDistrictLabel(merchant.district)} · {getCategoryLabel(box.category)}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <p className="text-[28px] font-extrabold tracking-tight text-giu-ink">
            {formatVnd(box.salePriceVnd)}
          </p>
          <p className="text-[13px] text-giu-muted line-through">
            {formatVnd(box.originalPriceVnd)}
          </p>
        </div>

        {box.description ? (
          <p className="text-[13px] leading-relaxed text-giu-muted">{box.description}</p>
        ) : null}

        {box.freshnessNote ? (
          <div className="giu-info-banner">{box.freshnessNote}</div>
        ) : null}

        <dl className="grid grid-cols-2 gap-2 text-[13px]">
          {[
            ["날짜", formatPickupDate(box.pickupStart)],
            ["시간", formatPickupWindow(box.pickupStart, box.pickupEnd)],
            ["남음", `${box.quantityLeft}개`],
            ["주소", merchant.address],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[14px] bg-white/70 px-3 py-2.5 ring-1 ring-giu-border">
              <dt className="text-[11px] font-medium text-giu-muted">{label}</dt>
              <dd className="mt-0.5 font-semibold leading-snug text-giu-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <MapEmbed address={merchant.address} compact />

        <div className="flex gap-4 text-[13px] font-bold">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-giu-primary">
            지도 앱
          </a>
          {zaloUrl ? (
            <a href={zaloUrl} target="_blank" rel="noopener noreferrer" className="text-giu-primary">
              Zalo
            </a>
          ) : null}
        </div>
      </div>

      {soldOut ? (
        <div className="giu-card text-center">
          <p className="font-bold text-giu-ink">매진</p>
          <p className="mt-1 text-[13px] text-giu-muted">다른 박스를 고르거나 즐겨찾기를 켜 두세요.</p>
          <Link href="/giu/hop" className="giu-btn-primary mt-3 block text-center">
            다른 박스
          </Link>
        </div>
      ) : (
        <div className="giu-sticky-pay">
          <ReserveForm
            boxId={box.id}
            salePriceVnd={box.salePriceVnd}
            checkoutBackend={checkoutBackend}
            compact
          />
        </div>
      )}
    </div>
  );
}
