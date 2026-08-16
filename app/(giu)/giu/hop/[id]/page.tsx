import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/giu/components/FavoriteButton";
import { MapEmbed } from "@/giu/components/MapEmbed";
import { ReserveForm } from "@/giu/components/ReserveForm";
import {
  formatRatingLine,
  isClosingSoon,
  isSurpriseTitle,
} from "@/giu/lib/box-ux";
import {
  formatDiscount,
  formatPickupDate,
  formatPickupWindow,
  formatVnd,
} from "@/giu/lib/format";
import { merchantCoords } from "@/giu/lib/geo";
import { t } from "@/giu/lib/i18n";
import { categoryLabel, districtLabel } from "@/giu/lib/labels-locale";
import { googleMapsSearchUrl, zaloChatUrl } from "@/giu/lib/links";
import { getGiuLocaleServer } from "@/giu/lib/locale-server";
import { resolveGiuPaymentBackend } from "@/giu/lib/payments";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { getGiuHref } from "@/giu/lib/giu-href-server";
import { getBox, getMerchant } from "@/giu/lib/store";

type Props = { params: Promise<{ id: string }> };

export default async function GiuBoxDetailPage({ params }: Props) {
  const { id } = await params;
  const locale = await getGiuLocaleServer();
  const href = await getGiuHref();
  const box = await getBox(id);
  if (!box) notFound();
  const merchant = await getMerchant(box.merchantId);
  if (!merchant) notFound();

  const soldOut = box.status !== "mo" || box.quantityLeft <= 0;
  const checkoutBackend = resolveGiuPaymentBackend();
  const mapsUrl = googleMapsSearchUrl(merchant.address);
  const zaloUrl = merchant.zalo ? zaloChatUrl(merchant.zalo) : null;
  const coords = merchantCoords(merchant.id, merchant.district);
  const surprise = isSurpriseTitle(box.title);
  const closing = !soldOut && isClosingSoon(box.pickupEnd);
  const rating = formatRatingLine(merchant.rating, merchant.reviewCount, locale);

  return (
    <div className="giu-page !pt-0 space-y-3">
      <div className="flex items-center justify-between gap-2 py-2">
        <Link href={href(GIU_ROUTES.customer.home)} className="text-[13px] font-bold text-giu-primary">
          {t(locale, "back")}
        </Link>
        <FavoriteButton merchantId={merchant.id} merchantName={merchant.name} />
      </div>

      <div className="giu-photo relative aspect-[16/10] overflow-hidden rounded-[20px] ring-1 ring-giu-border">
        {box.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={box.imageUrl} alt={box.title} />
        ) : (
          <div className="flex h-full items-end bg-gradient-to-br from-giu-primary-soft to-giu-accent-soft p-5">
            <p className="text-2xl font-extrabold text-giu-ink">{box.title}</p>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {surprise ? (
            <span className="rounded-md bg-giu-ink/90 px-2 py-1 text-[11px] font-bold text-white">
              {t(locale, "surprise")}
            </span>
          ) : null}
          {closing ? (
            <span className="rounded-md bg-giu-accent px-2 py-1 text-[11px] font-bold text-white">
              {t(locale, "closingSoon")}
            </span>
          ) : null}
        </div>
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
            {merchant.name} · {districtLabel(merchant.district, locale)} ·{" "}
            {categoryLabel(box.category, locale)}
          </p>
          {rating ? (
            <p className="mt-1 text-[12px] font-bold text-giu-ink">{rating}</p>
          ) : null}
        </div>

        <div className="flex items-baseline gap-2">
          <p className="text-[28px] font-extrabold tracking-tight text-giu-ink">
            {formatVnd(box.salePriceVnd)}
          </p>
          <p className="text-[13px] text-giu-muted line-through">
            {formatVnd(box.originalPriceVnd)}
          </p>
        </div>

        {surprise ? (
          <p className="text-[12px] leading-snug text-giu-muted">{t(locale, "surpriseHint")}</p>
        ) : null}

        {box.description ? (
          <p className="text-[13px] leading-relaxed text-giu-muted">{box.description}</p>
        ) : null}

        {box.freshnessNote ? (
          <div className="giu-info-banner">{box.freshnessNote}</div>
        ) : null}

        <dl className="grid grid-cols-2 gap-2 text-[13px]">
          {(
            [
              [t(locale, "date"), formatPickupDate(box.pickupStart)],
              [t(locale, "time"), formatPickupWindow(box.pickupStart, box.pickupEnd)],
              [t(locale, "left"), `${box.quantityLeft}`],
              [t(locale, "address"), merchant.address],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-[14px] bg-white/70 px-3 py-2.5 ring-1 ring-giu-border">
              <dt className="text-[11px] font-medium text-giu-muted">{label}</dt>
              <dd className="mt-0.5 font-semibold leading-snug text-giu-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <MapEmbed
          address={merchant.address}
          destLat={coords.lat}
          destLng={coords.lng}
          compact
        />

        <div className="flex gap-4 text-[13px] font-bold">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-giu-primary">
            {t(locale, "maps")}
          </a>
          {zaloUrl ? (
            <a href={zaloUrl} target="_blank" rel="noopener noreferrer" className="text-giu-primary">
              {t(locale, "zalo")}
            </a>
          ) : null}
        </div>
      </div>

      {soldOut ? (
        <div className="giu-card text-center">
          <p className="font-bold text-giu-ink">{t(locale, "soldOut")}</p>
          <p className="mt-1 text-[13px] text-giu-muted">{t(locale, "soldOutHint")}</p>
          <Link href={href(GIU_ROUTES.customer.home)} className="giu-btn-primary mt-3 block text-center">
            {t(locale, "otherBoxes")}
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
