import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { RankingsPanel } from "@/toss-shop/components/RankingsPanel";
import { DashboardPage } from "@/toss-shop/components/layout/DashboardLayout";

export default async function RankingsPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <DashboardPage title="랭킹·가격 추적" description="베스트셀러 순위와 가격 변동을 모니터링합니다.">
      <RankingsPanel />
    </DashboardPage>
  );
}
