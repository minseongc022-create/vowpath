import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { JarvisReviewPanel } from "@/toss-shop/components/JarvisReviewPanel";
import { DashboardPage } from "@/toss-shop/components/layout/DashboardLayout";

export default async function ReviewPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <DashboardPage
      title="등록 전 검수"
      description="고객에게 보일 모습 그대로 확인하고 승인하세요 · 승인 전까지 등록되지 않습니다"
    >
      <JarvisReviewPanel />
    </DashboardPage>
  );
}
