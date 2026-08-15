import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CancelReservationButton } from "@/giu/components/CancelReservationButton";
import { MapEmbed } from "@/giu/components/MapEmbed";
import { ReservationPaymentPoller } from "@/giu/components/PayStatusBanner";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import { googleMapsSearchUrl, zaloChatUrl } from "@/giu/lib/links";
import { getBox, getMerchant, getReservation } from "@/giu/lib/store";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; pay?: string }>;
};

export default async function GiuReservationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const reservation = await getReservation(id);
  if (!reservation) notFound();

  const paid = reservation.paymentStatus === "paid";
  const pending = reservation.paymentStatus === "pending";
  const held = reservation.settlementStatus === "held";
  const released = reservation.settlementStatus === "released";

  const [box, merchant] = await Promise.all([
    getBox(reservation.boxId),
    getMerchant(reservation.merchantId),
  ]);

  const mapsUrl = merchant ? googleMapsSearchUrl(merchant.address) : null;
  const zaloUrl = merchant?.zalo ? zaloChatUrl(merchant.zalo) : null;

  return (
    <div className="giu-page space-y-3">
      {pending ? (
        <div className="giu-card space-y-2 text-center">
          <span className="giu-badge bg-amber-50 text-amber-700">결제 대기</span>
          <p className="text-[13px] text-giu-muted">결제하면 구출 코드가 열립니다.</p>
          {sp.pay === "pending" ? (
            <p className="text-[11px] text-giu-muted">결제 창에서 돌아옴 · 확인 중</p>
          ) : null}
          <Suspense fallback={null}>
            <ReservationPaymentPoller reservationId={id} pending />
          </Suspense>
        </div>
      ) : paid ? (
        <div className="giu-ticket space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-giu-primary">
            Giu Pickup
          </p>
          {sp.paid === "1" ? (
            <p className="text-[11px] font-semibold text-giu-accent">결제 확인</p>
          ) : null}
          <p className="giu-ticket-code">{reservation.code}</p>
          <p className="text-[13px] font-medium text-giu-muted">가게에 이 코드만 보여주세요</p>
          <p className="text-[12px] font-semibold text-giu-accent">
            {reservation.smsSent ? "✓ SMS 발송됨" : "✓ 앱에서 코드 보관"}
          </p>
          {held ? (
            <p className="text-[11px] leading-snug text-giu-muted">
              Giu가 금액 보관 중 · 픽업 확인 후 가게 정산
            </p>
          ) : released ? (
            <p className="text-[11px] text-giu-muted">픽업 완료 · 정산됨</p>
          ) : null}
        </div>
      ) : (
        <div className="giu-card text-center text-[13px] text-giu-muted">결제 실패 또는 취소</div>
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
            </div>
            <MapEmbed address={merchant.address} compact />
            <div className="flex gap-4 text-[13px] font-bold">
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-giu-primary">
                  지도 앱
                </a>
              ) : null}
              {zaloUrl ? (
                <a href={zaloUrl} target="_blank" rel="noopener noreferrer" className="text-giu-primary">
                  Zalo
                </a>
              ) : null}
            </div>
          </>
        ) : null}
        <div className="giu-divider" />
        <div className="flex items-center justify-between text-[14px]">
          <span className="text-giu-muted">합계</span>
          <span className="font-extrabold text-giu-ink">{formatVnd(reservation.totalVnd)}</span>
        </div>
      </div>

      {paid && reservation.status === "giu_cho" ? (
        <CancelReservationButton reservationId={reservation.id} />
      ) : null}

      <Link href="/giu/hop" className="block text-center text-[13px] font-bold text-giu-primary">
        더 구출하기
      </Link>
    </div>
  );
}
