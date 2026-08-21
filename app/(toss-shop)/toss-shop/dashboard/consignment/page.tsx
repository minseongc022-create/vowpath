import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { ConsignmentPanel } from "@/toss-shop/components/ConsignmentPanel";
import { DashboardPage } from "@/toss-shop/components/layout/DashboardLayout";

export default async function ConsignmentPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <DashboardPage title="위탁판매 AI" description="하루 5개 — 경쟁가 자동 매칭 · 수익 예측 · 토스쇼핑 전용">
      <ConsignmentPanel />
    </DashboardPage>
  );
}
