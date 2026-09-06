import { notFound } from "next/navigation";
import { FavoriteButton } from "@/giu/components/FavoriteButton";
import { GiuCustomerBackLink, GiuCustomerNavLink } from "@/giu/components/GiuCustomerNavLinks";
import { MapEmbed } from "@/giu/components/MapEmbed";
import { ReserveForm } from "@/giu/components/ReserveForm";
import {
  formatRatingLine,
  isClosingSoon,
  isLowStock,
} from "@/giu/lib/box-ux";
import { boxImages } from "@/giu/lib/box-images";
import {
  formatDiscount,
  formatPickupDate,
  formatPickupWindow,
  formatVnd,
} from "@/giu/lib/format";
import { merchantCoords } from "@/giu/lib/geo";
import { t } from "@/giu/lib/i18n";
import { categoryLabel, districtLabel } from "@/giu/lib/labels-locale";
import { zaloChatUrl } from "@/giu/lib/links";
import { getGiuLocaleServer } from "@/giu/lib/locale-server";
import { resolveGiuPaymentBackend } from "@/giu/lib/payments";
import { tossClientKey } from "@/giu/lib/toss-payments";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { getGiuHref } from "@/giu/lib/giu-href-server";
import { MerchantReviews } from "@/giu/components/MerchantReviews";
import { ProductFreshnessTrust } from "@/giu/components/ProductFreshnessTrust";
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
  const tossKey = checkoutBackend === "toss" ? tossClientKey() : undefined;
  const zaloUrl = merchant.zalo ? zaloChatUrl(merchant.zalo) : null;
  const coords = merchantCoords(merchant.id, merchant.district);
  const lowStock = !soldOut && isLowStock(box.quantityLeft, box.quantityTotal);
  const closing = !soldOut && isClosingSoon(box.pickupEnd);
  const rating = formatRatingLine(merchant.rating, merchant.reviewCount, locale);

  const photos = boxImages(box);

  const badges = (
    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
      <span className="rounded-md bg-giu-ink/90 px-2 py-1 text-[11px] font-bold text-white">
        {t(locale, "dealBadge")}
      </span>
      {lowStock ? (
        <span className="rounded-md bg-giu-gold px-2 py-1 text-[11px] font-bold text-giu-ink">
          {t(locale, "qtyUrgent")}
        </span>
      ) : null}
      {closing ? (
        <span className="rounded-md bg-giu-accent px-2 py-1 text-[11px] font-bold text-white">
          {t(locale, "pickupSoon")}
        </span>
      ) : null}
    </div>
  );

  return (
    <div className={`giu-page !pt-0 space-y-3 ${soldOut ? "" : "giu-page-sticky-checkout"}`}>
      <div className="flex items-center justify-between gap-2 py-2">
        <GiuCustomerBackLink href={href(GIU_ROUTES.customer.home)} className="giu-btn-3d giu-tap text-[13px] font-bold text-giu-accent">
          {t(locale, "back")}
        </GiuCustomerBackLink>
        <FavoriteButton merchantId={merchant.id} merchantName={merchant.name} />
      </div>

      <div className="relative">
        {photos.length > 1 ? (
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
            {photos.map((url) => (
              <div
                key={url}
                className="giu-photo relative aspect-[16/10] w-[88%] shrink-0 snap-center overflow-hidden rounded-[20px] ring-1 ring-giu-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={box.title} />
              </div>
            ))}
          </div>
        ) : (
          <div className="giu-photo relative aspect-[16/10] overflow-hidden rounded-[20px] ring-1 ring-giu-border">
            {photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[0]} alt={box.title} />
            ) : (
              <div className="flex h-full items-end bg-gradient-to-br from-giu-primary-soft to-giu-accent-soft p-5">
                <p className="text-2xl font-extrabold text-giu-ink">{box.title}</p>
              </div>
            )}
          </div>
        )}
        {badges}
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
            <GiuCustomerNavLink
              href={href(GIU_ROUTES.customer.merchant(merchant.id))}
              className="giu-btn-3d giu-tap font-bold text-giu-primary underline-offset-2 hover:underline"
            >
              {merchant.name}
            </GiuCustomerNavLink>
            {" · "}
            {districtLabel(merchant.district, locale)} · {categoryLabel(box.category, locale)}
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

        {box.description ? (
          <p className="text-[13px] leading-relaxed text-giu-muted">{box.description}</p>
        ) : null}

        <ProductFreshnessTrust locale={locale} box={box} />

        <div className="rounded-[14px] bg-giu-primary-soft px-3 py-3 ring-1 ring-giu-primary/15">
          <p className="text-[12px] font-bold text-giu-primary">{t(locale, "pickupWindowConfirm")}</p>
          <p className="mt-1 text-[15px] font-extrabold text-giu-ink">
            {formatPickupDate(box.pickupStart)} · {formatPickupWindow(box.pickupStart, box.pickupEnd)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-[13px]">
          {(
            [
              [t(locale, "date"), formatPickupDate(box.pickupStart)],
              [t(locale, "time"), formatPickupWindow(box.pickupStart, box.pickupEnd)],
              [t(locale, "leftCount"), `${box.quantityLeft}개 / ${box.quantityTotal}개`],
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
          placeName={merchant.name}
          compact
        />

        {zaloUrl ? (
          <div className="flex gap-4 text-[13px] font-bold">
            <a href={zaloUrl} target="_blank" rel="noopener noreferrer" className="text-giu-accent">
              {t(locale, "zalo")}
            </a>
          </div>
        ) : null}

        <div className="pb-6">
          <MerchantReviews merchantId={merchant.id} locale={locale} />
        </div>
      </div>

      {soldOut ? (
        <div className="giu-card text-center">
          <p className="font-bold text-giu-ink">{t(locale, "soldOut")}</p>
          <p className="mt-1 text-[13px] text-giu-muted">{t(locale, "soldOutHint")}</p>
          <GiuCustomerBackLink href={href(GIU_ROUTES.customer.home)} className="giu-btn-primary giu-btn-3d mt-3 block text-center">
            {t(locale, "otherBoxes")}
          </GiuCustomerBackLink>
        </div>
      ) : (
        <div className="giu-sticky-pay">
          <ReserveForm
            boxId={box.id}
            boxTitle={box.title}
            salePriceVnd={box.salePriceVnd}
            maxQuantity={box.quantityLeft}
            checkoutBackend={checkoutBackend}
            tossClientKey={tossKey}
            compact
          />
        </div>
      )}
    </div>
  );
}
