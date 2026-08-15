import { MyReservationsLookup } from "@/giu/components/MyReservationsLookup";

export default function GiuMyCodesPage() {
  return (
    <div className="giu-page space-y-4">
      <header>
        <h1 className="giu-section-title">내 코드</h1>
        <p className="giu-section-sub">가게에서 보여주면 끝</p>
      </header>
      <MyReservationsLookup />
    </div>
  );
}
