import { ImpactStrip } from "@/giu/components/ImpactStrip";
import { MyReservationsLookup } from "@/giu/components/MyReservationsLookup";
import { getGiuSession } from "@/giu/lib/auth-request";
import { listReservations } from "@/giu/lib/store";

export default async function GiuMyCodesPage() {
  const session = await getGiuSession();
  let rescued = 0;
  let saved = 0;
  if (session?.role === "customer" && session.sub) {
    const list = await listReservations({ customerId: session.sub });
    const done = list.filter((r) => r.paymentStatus === "paid");
    rescued = done.reduce((s, r) => s + r.quantity, 0);
    saved = done.reduce((s, r) => s + r.totalVnd, 0);
  }

  return (
    <div className="giu-page space-y-4">
      <header>
        <h1 className="giu-section-title">내 코드</h1>
        <p className="giu-section-sub">가게에서 보여주면 끝</p>
      </header>
      {session?.role === "customer" ? <ImpactStrip rescuedBoxes={rescued} savedVnd={saved} /> : null}
      <MyReservationsLookup />
    </div>
  );
}
