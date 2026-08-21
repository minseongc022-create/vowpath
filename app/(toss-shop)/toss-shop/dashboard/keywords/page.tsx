import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { KeywordsPanel } from "@/toss-shop/components/KeywordsPanel";
import { DashboardPage } from "@/toss-shop/components/layout/DashboardLayout";

export default async function KeywordsPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <DashboardPage title="키워드 분석" description="검색량·경쟁강도·상위 상품·연관 키워드를 한곳에서 분석합니다.">
      <Suspense fallback={<div className="ts-skeleton h-64 w-full rounded-2xl" />}>
        <KeywordsPanel />
      </Suspense>
    </DashboardPage>
  );
}
