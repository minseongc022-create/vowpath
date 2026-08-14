import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelReservationButton } from "@/giu/components/CancelReservationButton";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import { GIU_STRINGS } from "@/giu/lib/strings";
import { getBox, getMerchant, getReservation } from "@/giu/lib/store";

type Props = { params: Promise<{ id: string }> };

export default async function GiuReservationPage({ params }: Props) {
  const { id } = await params;
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

  return (
    <div className="giu-page space-y-5 text-center">
      {pending ? (
        <div className="giu-card space-y-3">
          <span className="giu-badge-safe bg-amber-50 text-amber-700">결제 대기</span>
          <p className="text-sm text-giu-muted">
            결제를 완료하면 코드를 받을 수 있습니다. 이미 결제했다면 잠시 후 새로고침하세요.
          </p>
        </div>
      ) : paid ? (
        <div className="giu-card space-y-4">
          <span className="giu-badge-safe">구출 코드</span>
          <p className="font-mono text-5xl font-extrabold tracking-[0.18em] text-giu-ink">
            {reservation.code}
          </p>
          <p className="text-sm text-giu-muted">가게에서 이 코드를 보여주고 박스를 받으세요</p>
          <p className="text-sm font-medium text-giu-accent">✓ 결제 완료 · SMS 발송됨</p>
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
