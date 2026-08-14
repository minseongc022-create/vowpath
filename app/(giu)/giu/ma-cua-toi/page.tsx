import { MyReservationsLookup } from "@/giu/components/MyReservationsLookup";

export default function GiuMyCodesPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-giu-ink">Mã giải cứu của tôi</h1>
      <p className="mt-2 text-sm text-giu-muted">Các đơn đã thanh toán — mã lấy hàng tại quán</p>
      <div className="mt-8">
        <MyReservationsLookup />
      </div>
    </div>
  );
}
