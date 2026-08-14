import { MyReservationsLookup } from "@/giu/components/MyReservationsLookup";

export default function GiuMyCodesPage() {
  return (
    <div className="giu-page">
      <h1 className="giu-section-title">구출 코드</h1>
      <p className="giu-section-sub">결제 완료 주문 — 가게에서 픽업할 코드</p>
      <div className="mt-6">
        <MyReservationsLookup />
      </div>
    </div>
  );
}
