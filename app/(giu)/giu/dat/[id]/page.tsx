import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RefundReservationButton } from "@/giu/components/RefundReservationButton";
import { CustomerExtensionRequestForm } from "@/giu/components/CustomerExtensionRequestForm";
import { ReservationChatButton } from "@/giu/components/ReservationChatButton";
import { ReservationDeepLinkScroll } from "@/giu/components/ReservationDeepLinkScroll";
import { ProductFreshnessTrust } from "@/giu/components/ProductFreshnessTrust";
import { GiuCustomerBackLink } from "@/giu/components/GiuCustomerNavLinks";
import { MapEmbed } from "@/giu/components/MapEmbed";
import { ReservationPaymentPoller } from "@/giu/components/PayStatusBanner";
import { formatPickupWindowWithDate, formatVnd } from "@/giu/lib/format";
import { merchantCoords } from "@/giu/lib/geo";
import { t } from "@/giu/lib/i18n";
import { getGiuLocaleServer } from "@/giu/lib/locale-server";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { getGiuHref } from "@/giu/lib/giu-href-server";
import { zaloChatUrl } from "@/giu/lib/links";
import { ReservationTicketExtras } from "@/giu/components/ReservationTicketExtras";
import { canRequestExtensionInApp, resolvePickupPolicy } from "@/giu/lib/pickup-policy";
import { getBox, getMerchant, getReservation, getReviewForReservation } from "@/giu/lib/store";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; pay?: string; from?: string }>;
};

export default async function GiuReservationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const locale = await getGiuLocaleServer();
  const href = await getGiuHref();
  const reservation = await getReservation(id);
  if (!reservation) notFound();

  const paid = reservation.paymentStatus === "paid";
  const pending = reservation.paymentStatus === "pending";
  const pickedUp = reservation.status === "da_lay";
  const expired = reservation.status === "het_han";

  const [box, merchant, existingReview] = await Promise.all([
    getBox(reservation.boxId),
    getMerchant(reservation.merchantId),
    getReviewForReservation(id),
  ]);

  const zaloUrl = merchant?.zalo ? zaloChatUrl(merchant.zalo) : null;
  const coords = merchant ? merchantCoords(merchant.id, merchant.district) : null;
  const policy = resolvePickupPolicy(merchant);
  const canRequestInApp = Boolean(
    box &&
      (reservation.status === "giu_cho" || reservation.status === "het_han") &&
      canRequestExtensionInApp(box.pickupEnd, policy),
  );
  const hasPromise =
    reservation.merchantPickupPromiseUntil &&
    new Date(reservation.merchantPickupPromiseUntil).getTime() > Date.now();
  const extensionStatus = reservation.extensionRequest?.status;

  const defaultPlanned = box
    ? (() => {
        const d = new Date(box.pickupEnd);
        d.setDate(d.getDate() + 1);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      })()
    : undefined;

  return (
    <div className="giu-page space-y-3">
      <ReservationDeepLinkScroll from={sp.from} />
      {pending ? (
        <div className="giu-card space-y-2 text-center">
          <span className="giu-badge bg-amber-50 text-amber-700">{t(locale, "payPending")}</span>
          <p className="text-[13px] text-giu-muted">{t(locale, "payPendingHint")}</p>
          {sp.pay === "pending" ? (
            <p className="text-[11px] text-giu-muted">{t(locale, "paying")}</p>
          ) : null}
          <Suspense fallback={null}>
            <ReservationPaymentPoller reservationId={id} pending />
          </Suspense>
        </div>
      ) : paid ? (
        <div className="giu-ticket space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-giu-accent">
            {t(locale, "pickupQr")}
          </p>
          {sp.paid === "1" ? (
            <p className="text-[11px] font-semibold text-giu-accent">{t(locale, "settleHeld")}</p>
          ) : null}
          <p className="text-[13px] font-medium text-giu-muted">{t(locale, "showCode")}</p>
          <p className="text-[12px] leading-relaxed text-giu-muted">{t(locale, "pickupPinHint")}</p>
          {pickedUp ? (
            <p className="text-[12px] font-semibold text-giu-accent">{t(locale, "settleReleased")}</p>
          ) : hasPromise ? (
            <p className="text-[12px] font-semibold text-giu-primary">{t(locale, "cPickupPromisedHint")}</p>
          ) : expired ? (
            <p className="text-[12px] font-semibold text-amber-800">{t(locale, "cPickupExpiredHint")}</p>
          ) : (
            <p className="text-[12px] font-semibold text-giu-ink">{t(locale, "settleHeld")}</p>
          )}
          {reservation.smsSent ? (
            <p className="text-[11px] text-giu-muted">{t(locale, "paidSms")}</p>
          ) : (
            <p className="text-[11px] text-giu-muted">{t(locale, "paidAppOnly")}</p>
          )}
          <ReservationTicketExtras
            reservationId={id}
            pickupCode={reservation.code}
            pickedUp={pickedUp}
            paid={paid}
            existingReviewRating={existingReview?.rating}
          />
        </div>
      ) : (
        <div className="giu-card text-center text-[13px] text-giu-muted">{t(locale, "payFailed")}</div>
      )}

      <div className="giu-card space-y-3 text-left">
        {merchant ? (
          <>
            <div>
              <p className="text-[15px] font-extrabold text-giu-ink">{merchant.name}</p>
              {box ? (
                <p className="mt-0.5 text-[13px] text-giu-muted">
                  {box.title} · {formatPickupWindowWithDate(box.pickupStart, box.pickupEnd)}
                </p>
              ) : null}
              <p className="mt-1 text-[13px] font-bold text-giu-ink">
                {t(locale, "total")} {formatVnd(reservation.totalVnd)}
              </p>
            </div>
            {box ? <ProductFreshnessTrust locale={locale} box={box} compact /> : null}
            <MapEmbed
              address={merchant.address}
              destLat={coords?.lat}
              destLng={coords?.lng}
              placeName={merchant.name}
              compact
            />
            {zaloUrl ? (
              <div className="text-[13px] font-bold">
                <a href={zaloUrl} target="_blank" rel="noopener noreferrer" className="text-giu-primary">
                  {t(locale, "zalo")}
                </a>
              </div>
            ) : null}
          </>
        ) : null}

        {paid && !pickedUp ? (
          <>
            {(reservation.status === "giu_cho" || reservation.status === "het_han") &&
            extensionStatus !== "approved" ? (
              <CustomerExtensionRequestForm
                locale={locale}
                reservationId={id}
                canRequestInApp={canRequestInApp}
                cutoffMinutes={policy.extensionRequestBeforeMinutes}
                extensionStatus={extensionStatus}
                defaultPlannedAt={defaultPlanned}
              />
            ) : null}
            {expired ? (
              <p className="text-[12px] leading-snug text-giu-muted">{t(locale, "cPickupExpiredActionHint")}</p>
            ) : null}
            <div id="giu-refund-section">
              <RefundReservationButton reservationId={id} />
            </div>
          </>
        ) : null}

        {paid && (reservation.status === "giu_cho" || pickedUp || expired) && merchant ? (
          <ReservationChatButton
            locale={locale}
            reservationId={id}
            viewerRole="customer"
            peerName={merchant.name}
            peerPhone={merchant.phone}
          />
        ) : null}

        <GiuCustomerBackLink
          href={href(GIU_ROUTES.customer.home)}
          className="giu-btn giu-btn-3d block w-full rounded-[14px] bg-white py-3 text-center text-[13px] font-bold text-giu-primary ring-2 ring-giu-primary/20"
        >
          {t(locale, "moreBrowse")}
        </GiuCustomerBackLink>
      </div>
    </div>
  );
}
