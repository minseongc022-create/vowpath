import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/giu/components/FavoriteButton";
import { MapEmbed } from "@/giu/components/MapEmbed";
import { ReserveForm } from "@/giu/components/ReserveForm";
import { getCategoryEmoji, getCategoryLabel } from "@/giu/lib/categories";
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
    <div className="giu-page space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/giu/hop" className="inline-flex text-sm font-semibold text-giu-primary">
          ← 돌아가기
        </Link>
        <FavoriteButton merchantId={merchant.id} merchantName={merchant.name} />
      </div>

      {box.imageUrl ? (
        <div className="overflow-hidden rounded-[20px] ring-1 ring-giu-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={box.imageUrl} alt={box.title} className="aspect-[16/10] w-full object-cover" />
        </div>
      ) : null}

      <div className="giu-card space-y-4">
        <div className="flex items-start gap-4">
          {!box.imageUrl ? (
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-giu-bg text-3xl">
              {getCategoryEmoji(box.category)}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-snug text-giu-ink">{box.title}</h1>
            <p className="mt-1 text-sm text-giu-muted">{merchant.name}</p>
            <p className="text-xs text-giu-muted">
              {getCategoryLabel(box.category)} · {getDistrictLabel(merchant.district)}
              {merchant.reviewCount > 0
                ? ` · ★ ${merchant.rating.toFixed(1)} (${merchant.reviewCount})`
                : ""}
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
            ["픽업 날짜", formatPickupDate(box.pickupStart)],
            ["픽업 시간", formatPickupWindow(box.pickupStart, box.pickupEnd)],
            ["남은 수량", `${box.quantityLeft}개`],
            ["주소", merchant.address],
          ].map(([label, value], i) => (
            <div key={label} className={`flex justify-between py-3 ${i > 0 ? "border-t border-giu-border" : ""}`}>
              <span className="text-giu-muted">{label}</span>
              <span className="max-w-[60%] text-right font-medium text-giu-ink">{value}</span>
            </div>
          ))}
        </div>

        <MapEmbed address={merchant.address} />

        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-giu-primary">
            지도 앱에서 열기
          </a>
          {zaloUrl ? (
            <a href={zaloUrl} target="_blank" rel="noopener noreferrer" className="text-giu-primary">
              Zalo로 문의
            </a>
          ) : null}
        </div>
      </div>

      {soldOut ? (
        <div className="giu-card text-center">
          <p className="font-semibold text-giu-ink">박스 매진</p>
          <p className="mt-2 text-sm text-giu-muted">19시 이후에 다시 오거나 다른 박스를 선택하세요.</p>
          <Link href="/giu/hop" className="giu-btn-primary mt-4 block text-center">
            다른 박스 보기
          </Link>
        </div>
      ) : (
        <ReserveForm
          boxId={box.id}
          salePriceVnd={box.salePriceVnd}
          checkoutBackend={checkoutBackend}
        />
      )}
    </div>
  );
}
