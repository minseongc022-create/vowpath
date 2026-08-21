import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { CompetitorsPanel } from "@/toss-shop/components/CompetitorsPanel";
import { DashboardPage } from "@/toss-shop/components/layout/DashboardLayout";

export default async function CompetitorsPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <DashboardPage title="경쟁사 모니터링" description="경쟁 셀러의 가격·랭킹 변동을 추적합니다.">
      <CompetitorsPanel />
    </DashboardPage>
  );
}
