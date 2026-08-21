import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { SettlementsPanel } from "@/toss-shop/components/SettlementsPanel";
import { DashboardPage } from "@/toss-shop/components/layout/DashboardLayout";

export default async function SettlementsPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <DashboardPage title="정산 대조" description="예상 정산금과 실제 입금액을 대조합니다.">
      <SettlementsPanel />
    </DashboardPage>
  );
}
