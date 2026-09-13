import { redirect } from "next/navigation";
import { BillingPanel } from "@/vibesafe/components/BillingPanel";
import { isDatabaseConfigured } from "@/vibesafe/lib/db";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "결제" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");

  if (!isDatabaseConfigured()) {
    return (
      <div className="vs-container">
        <div className="vs-alert" data-tone="warn">
          서버 데이터베이스가 연결되지 않았습니다. 운영자에게 문의해주세요.
        </div>
      </div>
    );
  }

  return (
    <div className="vs-container">
      <div className="vs-stack">
        <div>
          <h1 className="vs-page-title">결제</h1>
          <p className="vs-page-sub">플랜과 결제 내역을 확인합니다.</p>
        </div>
        <BillingPanel />
      </div>
    </div>
  );
}
