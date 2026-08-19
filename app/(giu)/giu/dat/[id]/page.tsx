import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CustomerOrderActions } from "@/giu/components/CustomerOrderActions";
import { OrderStatusBadge } from "@/giu/components/OrderStatusBadge";
import { OrderStatusTimeline } from "@/giu/components/OrderStatusTimeline";
import { RefundReservationButton } from "@/giu/components/RefundReservationButton";
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
import { isPickupQrValid, resolveDisplayOrderStatus, resolvePickupPolicy } from "@/giu/lib/pickup-policy";
import { isTerminalOrderStatus } from "@/giu/lib/order-status";
import { ReservationTicketExtras } from "@/giu/components/ReservationTicketExtras";
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
  const refunded = reservation.paymentStatus === "refunded";

  const [box, merchant, existingReview] = await Promise.all([
    getBox(reservation.boxId),
    getMerchant(reservation.merchantId),
    getReviewForReservation(id),
  ]);

  const policy = resolvePickupPolicy(merchant);
  const displayStatus = resolveDisplayOrderStatus(reservation, box?.pickupEnd, policy);
  const pickedUp =
    displayStatus === "pickup_completed" || displayStatus === "settlement_completed";
  const qrVisible = paid && isPickupQrValid({ ...reservation, status: displayStatus });
  const hasPromise =
    reservation.merchantPickupPromiseUntil &&
    new Date(reservation.merchantPickupPromiseUntil).getTime() > Date.now();

  const zaloUrl = merchant?.zalo ? zaloChatUrl(merchant.zalo) : null;
  const coords = merchant ? merchantCoords(merchant.id, merchant.district) : null;

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
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-giu-accent">
              {t(locale, "pickupQr")}
            </p>
            <OrderStatusBadge reservation={reservation} boxPickupEnd={box?.pickupEnd} policy={policy} />
          </div>
          {pickedUp ? (
            <p className="text-[13px] font-semibold text-giu-accent">{t(locale, "settleReleased")}</p>
          ) : displayStatus === "not_picked_up" ? (
            <p className="text-[13px] font-semibold text-amber-800">{t(locale, "orderNotPickedUpHint")}</p>
          ) : hasPromise ? (
            <p className="text-[13px] font-semibold text-giu-primary">{t(locale, "cPickupPromisedHint")}</p>
          ) : (
            <p className="text-[13px] text-giu-muted">{t(locale, "settleHeld")}</p>
          )}
          {qrVisible ? (
            <ReservationTicketExtras
              reservationId={id}
              pickupCode={reservation.code}
              pickedUp={pickedUp}
              paid={paid}
              existingReviewRating={existingReview?.rating}
            />
          ) : (
            <p className="text-[12px] text-giu-muted">{t(locale, "qrNotReady")}</p>
          )}
        </div>
      ) : refunded ? (
        <div className="giu-card text-center text-[13px] text-giu-muted">{t(locale, "payRefunded")}</div>
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

        {paid && !pickedUp && !isTerminalOrderStatus(displayStatus) ? (
          <>
            <CustomerOrderActions
              locale={locale}
              reservation={reservation}
              displayStatus={displayStatus}
              merchantName={merchant?.name ?? ""}
              merchantPhone={merchant?.phone}
              boxPickupStart={box?.pickupStart}
              boxPickupEnd={box?.pickupEnd}
              policy={policy}
              defaultPlannedAt={defaultPlanned}
            />
            <div id="giu-refund-section">
              <RefundReservationButton reservationId={id} />
            </div>
          </>
        ) : null}

        {paid ? <OrderStatusTimeline locale={locale} reservationId={id} /> : null}

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
