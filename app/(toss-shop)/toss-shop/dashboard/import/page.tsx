import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { ImportPanel } from "@/toss-shop/components/ImportPanel";
import { DashboardPage } from "@/toss-shop/components/layout/DashboardLayout";

export default async function ImportSalesPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <DashboardPage title="수입판매 AI" description="해외 소싱 · 랜딩비·관세 반영 · 국내 시장가 대비 수익 분석">
      <ImportPanel />
    </DashboardPage>
  );
}
