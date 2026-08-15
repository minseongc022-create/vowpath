import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CancelReservationButton } from "@/giu/components/CancelReservationButton";
import { ReservationPaymentPoller } from "@/giu/components/PayStatusBanner";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import { googleMapsSearchUrl, zaloChatUrl } from "@/giu/lib/links";
import { GIU_STRINGS } from "@/giu/lib/strings";
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
    <div className="giu-page space-y-5 text-center">
      {pending ? (
        <div className="giu-card space-y-3">
          <span className="giu-badge-safe bg-amber-50 text-amber-700">결제 대기</span>
          <p className="text-sm text-giu-muted">
            결제를 완료하면 코드를 받을 수 있습니다. 이미 결제했다면 자동으로 확인 중입니다…
          </p>
          {sp.pay === "pending" ? (
            <p className="text-xs text-giu-muted">결제 창에서 돌아왔습니다. 확인 중…</p>
          ) : null}
          <Suspense fallback={null}>
            <ReservationPaymentPoller reservationId={id} pending />
          </Suspense>
        </div>
      ) : paid ? (
        <div className="giu-card space-y-4">
          <span className="giu-badge-safe">구출 코드</span>
          {sp.paid === "1" ? (
            <p className="text-xs font-medium text-giu-accent">결제 확인됨</p>
          ) : null}
          <p className="font-mono text-5xl font-extrabold tracking-[0.18em] text-giu-ink">
            {reservation.code}
          </p>
          <p className="text-sm text-giu-muted">가게에서 이 코드를 보여주고 박스를 받으세요</p>
          <p className="text-sm font-medium text-giu-accent">
            {reservation.smsSent
              ? "✓ 결제 완료 · SMS 발송됨"
              : "✓ 결제 완료 · 앱에서 코드를 확인하세요"}
          </p>
          {held ? (
            <div className="giu-info-banner text-left text-sm">{GIU_STRINGS.escrowDesc}</div>
          ) : released ? (
            <p className="text-xs text-giu-muted">픽업 완료 · 가게에 정산됨</p>
          ) : null}
        </div>
      ) : (
        <div className="giu-card text-sm text-giu-muted">결제 실패 또는 취소되었습니다.</div>
      )}

      <div className="giu-card space-y-3 text-left">
        {merchant ? (
          <>
            <p className="font-semibold text-giu-ink">{merchant.name}</p>
            <p className="text-sm text-giu-muted">{merchant.address}</p>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-giu-primary"
                >
                  지도에서 보기
                </a>
              ) : null}
              {zaloUrl ? (
                <a
                  href={zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-giu-primary"
                >
                  Zalo로 문의
                </a>
              ) : null}
            </div>
          </>
        ) : null}
        {box ? <p className="text-sm text-giu-ink">{box.title}</p> : null}
        <div className="giu-divider" />
        <div className="flex items-center justify-between">
          <span className="text-giu-muted">합계</span>
          <span className="text-xl font-bold text-giu-ink">{formatVnd(reservation.totalVnd)}</span>
        </div>
        {box ? (
          <p className="text-sm text-giu-muted">
            픽업: {formatPickupWindow(box.pickupStart, box.pickupEnd)}
          </p>
        ) : null}
      </div>

      {paid && reservation.status === "giu_cho" ? (
        <CancelReservationButton reservationId={reservation.id} />
      ) : null}

      <Link href="/giu/hop" className="inline-block text-sm font-semibold text-giu-primary">
        더 찾아보기 →
      </Link>
    </div>
  );
}
