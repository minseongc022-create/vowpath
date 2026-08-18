import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RefundReservationButton } from "@/giu/components/RefundReservationButton";
import { GiuCustomerBackLink } from "@/giu/components/GiuCustomerNavLinks";
import { MapEmbed } from "@/giu/components/MapEmbed";
import { ReservationPaymentPoller } from "@/giu/components/PayStatusBanner";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import { merchantCoords } from "@/giu/lib/geo";
import { t } from "@/giu/lib/i18n";
import { getGiuLocaleServer } from "@/giu/lib/locale-server";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { getGiuHref } from "@/giu/lib/giu-href-server";
import { zaloChatUrl } from "@/giu/lib/links";
import { ReservationTicketExtras } from "@/giu/components/ReservationTicketExtras";
import { getBox, getMerchant, getReservation, getReviewForReservation } from "@/giu/lib/store";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; pay?: string }>;
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

  const [box, merchant, existingReview] = await Promise.all([
    getBox(reservation.boxId),
    getMerchant(reservation.merchantId),
    getReviewForReservation(id),
  ]);

  const zaloUrl = merchant?.zalo ? zaloChatUrl(merchant.zalo) : null;
  const coords = merchant ? merchantCoords(merchant.id, merchant.district) : null;

  return (
    <div className="giu-page space-y-3">
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
                  {box.title} · {formatPickupWindow(box.pickupStart, box.pickupEnd)}
                </p>
              ) : null}
              <p className="mt-1 text-[13px] font-bold text-giu-ink">
                {t(locale, "total")} {formatVnd(reservation.totalVnd)}
              </p>
            </div>
            <MapEmbed
              address={merchant.address}
              destLat={coords?.lat}
              destLng={coords?.lng}
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

        {paid && !pickedUp ? <RefundReservationButton reservationId={id} /> : null}

        <GiuCustomerBackLink href={href(GIU_ROUTES.customer.home)} className="giu-btn-3d giu-tap block text-center text-[13px] font-bold text-giu-primary">
          {t(locale, "moreBrowse")}
        </GiuCustomerBackLink>
      </div>
    </div>
  );
}
