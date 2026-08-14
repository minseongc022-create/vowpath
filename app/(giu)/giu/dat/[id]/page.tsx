import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelReservationButton } from "@/giu/components/CancelReservationButton";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import { getBox, getMerchant, getReservation } from "@/giu/lib/store";

type Props = { params: Promise<{ id: string }> };

export default async function GiuReservationPage({ params }: Props) {
  const { id } = await params;
  const reservation = await getReservation(id);
  if (!reservation) notFound();

  const paid = reservation.paymentStatus === "paid";
  const pending = reservation.paymentStatus === "pending";

  const [box, merchant] = await Promise.all([
    getBox(reservation.boxId),
    getMerchant(reservation.merchantId),
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      {pending ? (
        <>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            Chờ thanh toán
          </p>
          <p className="mt-4 text-giu-muted">
            Hoàn tất thanh toán VNPay để nhận mã giải cứu. Nếu đã trả, tải lại trang sau vài giây.
          </p>
        </>
      ) : paid ? (
        <>
          <p className="text-sm font-semibold uppercase tracking-wide text-giu-primary">
            Mã giải cứu của bạn
          </p>
          <p className="mt-4 font-mono text-5xl font-extrabold tracking-widest text-giu-ink">
            {reservation.code}
          </p>
          <p className="mt-2 text-giu-muted">Đọc mã này tại quán để nhận hộp</p>
          <p className="mt-1 text-sm font-medium text-green-700">✓ Đã thanh toán · SMS đã gửi</p>
        </>
      ) : (
        <p className="text-giu-muted">Thanh toán không thành công hoặc đã hủy.</p>
      )}

      <div className="mt-8 rounded-2xl border border-giu-border bg-white p-6 text-left">
        {merchant ? (
          <>
            <p className="font-semibold text-giu-ink">{merchant.name}</p>
            <p className="text-sm text-giu-muted">{merchant.address}</p>
          </>
        ) : null}
        {box ? <p className="mt-2 text-sm">{box.title}</p> : null}
        <p className="mt-4 text-lg font-bold text-giu-primary">
          {formatVnd(reservation.totalVnd)}
        </p>
        {box ? (
          <p className="mt-1 text-sm text-giu-muted">
            Lấy: {formatPickupWindow(box.pickupStart, box.pickupEnd)}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-giu-muted">
          Thanh toán: {reservation.paymentStatus} · {reservation.status}
        </p>
      </div>

      {paid && reservation.status === "giu_cho" ? (
        <div className="mt-6">
          <CancelReservationButton reservationId={reservation.id} />
        </div>
      ) : null}

      <Link href="/giu/hop" className="mt-8 inline-block text-sm font-semibold text-giu-primary">
        Săn thêm hộp →
      </Link>
    </div>
  );
}
