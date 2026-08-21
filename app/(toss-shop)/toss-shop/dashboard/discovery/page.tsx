import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { DiscoveryPanel } from "@/toss-shop/components/DiscoveryPanel";
import { DashboardPage } from "@/toss-shop/components/layout/DashboardLayout";

export default async function DiscoveryPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <DashboardPage title="아이템 발굴" description="카테고리별 키워드 수요·공급을 분석하고 판매 아이템을 찾습니다.">
      <DiscoveryPanel />
    </DashboardPage>
  );
}
