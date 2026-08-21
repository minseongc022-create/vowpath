import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { KeywordsPanel } from "@/toss-shop/components/KeywordsPanel";
import { DashboardPage } from "@/toss-shop/components/layout/DashboardLayout";

export default async function KeywordsPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <DashboardPage title="키워드 분석" description="검색량·경쟁도·상위 노출 상품을 분석합니다.">
      <KeywordsPanel />
    </DashboardPage>
  );
}
