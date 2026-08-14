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
          <span className="giu-badge-safe bg-amber-50 text-amber-700">Chờ thanh toán</span>
          <p className="text-sm text-giu-muted">
            Hoàn tất thanh toán VNPay để nhận mã. Nếu đã trả, tải lại trang sau vài giây.
          </p>
        </div>
      ) : paid ? (
        <div className="giu-card space-y-4">
          <span className="giu-badge-safe">Mã giải cứu</span>
          <p className="font-mono text-5xl font-extrabold tracking-[0.18em] text-giu-ink">
            {reservation.code}
          </p>
          <p className="text-sm text-giu-muted">Đọc mã này tại quán để nhận hộp</p>
          <p className="text-sm font-medium text-giu-accent">✓ Đã thanh toán · SMS đã gửi</p>
          {held ? (
            <div className="giu-info-banner text-left text-sm">{GIU_STRINGS.escrowDesc}</div>
          ) : released ? (
            <p className="text-xs text-giu-muted">Đã lấy hàng · quán đã nhận tiền</p>
          ) : null}
        </div>
      ) : (
        <div className="giu-card text-sm text-giu-muted">Thanh toán không thành công hoặc đã hủy.</div>
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
          <span className="text-giu-muted">Tổng</span>
          <span className="text-xl font-bold text-giu-ink">{formatVnd(reservation.totalVnd)}</span>
        </div>
        {box ? (
          <p className="text-sm text-giu-muted">
            Lấy: {formatPickupWindow(box.pickupStart, box.pickupEnd)}
          </p>
        ) : null}
      </div>

      {paid && reservation.status === "giu_cho" ? (
        <CancelReservationButton reservationId={reservation.id} />
      ) : null}

      <Link href="/giu/hop" className="inline-block text-sm font-semibold text-giu-primary">
        Săn thêm hộp →
      </Link>
    </div>
  );
}
