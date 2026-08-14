import { MyReservationsLookup } from "@/giu/components/MyReservationsLookup";

export default function GiuMyCodesPage() {
  return (
    <div className="giu-page">
      <h1 className="giu-section-title">Mã giải cứu</h1>
      <p className="giu-section-sub">Các đơn đã thanh toán — mã lấy hàng tại quán</p>
      <div className="mt-6">
        <MyReservationsLookup />
      </div>
    </div>
  );
}
