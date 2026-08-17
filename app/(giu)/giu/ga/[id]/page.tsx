import { notFound } from "next/navigation";
import { BoxCard } from "@/giu/components/BoxCard";
import { FavoriteButton } from "@/giu/components/FavoriteButton";
import { GiuCustomerBackLink } from "@/giu/components/GiuCustomerNavLinks";
import { MapEmbed } from "@/giu/components/MapEmbed";
import { MerchantReviews } from "@/giu/components/MerchantReviews";
import { formatRatingLine } from "@/giu/lib/box-ux";
import { getCategoryEmoji } from "@/giu/lib/categories";
import { merchantCoords } from "@/giu/lib/geo";
import { getGiuHref } from "@/giu/lib/giu-href-server";
import { t } from "@/giu/lib/i18n";
import { categoryLabel, districtLabel } from "@/giu/lib/labels-locale";
import { getGiuLocaleServer } from "@/giu/lib/locale-server";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { getMerchant, listBoxes } from "@/giu/lib/store";

type Props = { params: Promise<{ id: string }> };

export default async function GiuMerchantStorePage({ params }: Props) {
  const { id } = await params;
  const locale = await getGiuLocaleServer();
  const href = await getGiuHref();
  const merchant = await getMerchant(id);
  if (!merchant) notFound();

  const openBoxes = await listBoxes({ merchantId: id, openOnly: true });
  const coords = merchantCoords(merchant.id, merchant.district);
  const rating = formatRatingLine(merchant.rating, merchant.reviewCount, locale);

  return (
    <div className="giu-page space-y-4">
      <GiuCustomerBackLink href={href(GIU_ROUTES.customer.favorites)} className="giu-btn-3d giu-tap text-[13px] font-bold text-giu-accent">
        {t(locale, "storeBack")}
      </GiuCustomerBackLink>

      <header className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-giu-primary-soft text-2xl ring-1 ring-giu-border">
          {getCategoryEmoji(merchant.category)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-[22px] font-extrabold tracking-tight text-giu-ink">{merchant.name}</h1>
            <FavoriteButton merchantId={merchant.id} merchantName={merchant.name} />
          </div>
          <p className="mt-1 text-[13px] font-medium text-giu-muted">
            {districtLabel(merchant.district, locale)} · {categoryLabel(merchant.category, locale)}
          </p>
          {rating ? <p className="mt-1 text-[12px] font-bold text-giu-ink">{rating}</p> : null}
          {merchant.verified ? (
            <p className="mt-1 text-[11px] font-bold text-giu-primary">{t(locale, "mVerified")}</p>
          ) : null}
        </div>
      </header>

      <div className="giu-info-banner text-[13px] leading-relaxed">
        {t(locale, "storeAboutHint").replace("{category}", categoryLabel(merchant.category, locale))}
      </div>

      <dl className="grid grid-cols-1 gap-2 text-[13px]">
        <div className="rounded-[14px] bg-white/80 px-3 py-2.5 ring-1 ring-giu-border">
          <dt className="text-[11px] font-medium text-giu-muted">{t(locale, "address")}</dt>
          <dd className="mt-0.5 font-semibold leading-snug text-giu-ink">{merchant.address}</dd>
        </div>
        {merchant.phone ? (
          <div className="rounded-[14px] bg-white/80 px-3 py-2.5 ring-1 ring-giu-border">
            <dt className="text-[11px] font-medium text-giu-muted">{t(locale, "storePhone")}</dt>
            <dd className="mt-0.5 font-semibold text-giu-ink">
              <a href={`tel:${merchant.phone}`} className="text-giu-primary">
                {merchant.phone}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      <MapEmbed address={merchant.address} destLat={coords.lat} destLng={coords.lng} compact />

      <section className="space-y-2">
        <h2 className="text-[15px] font-bold text-giu-ink">
          {t(locale, "storeOpenBoxes")} · {openBoxes.length}
        </h2>
        {openBoxes.length === 0 ? (
          <p className="text-[13px] text-giu-muted">{t(locale, "storeNoOpenBoxes")}</p>
        ) : (
          <div className="space-y-2.5">
            {openBoxes.map((box, i) => (
              <BoxCard key={box.id} box={box} merchant={merchant} index={i} />
            ))}
          </div>
        )}
      </section>

      <MerchantReviews merchantId={merchant.id} locale={locale} limit={10} />
    </div>
  );
}
