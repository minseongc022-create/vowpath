import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { JarvisListingsPanel } from "@/toss-shop/components/JarvisListingPanel";
import { DashboardPage } from "@/toss-shop/components/layout/DashboardLayout";

export default async function ListingsPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <DashboardPage
      title="Jarvis 등록함"
      description="OK 사인 후 토스 등록 · AI 상세페이지 · Matchcut 연동 예정"
    >
      <JarvisListingsPanel />
    </DashboardPage>
  );
}
