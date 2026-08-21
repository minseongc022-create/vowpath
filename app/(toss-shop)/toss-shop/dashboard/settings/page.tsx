import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { SettingsPanel } from "@/toss-shop/components/SettingsPanel";
import { DashboardPage } from "@/toss-shop/components/layout/DashboardLayout";

export default async function SettingsPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <DashboardPage title="설정" description="토스 셀러 연동 및 계정 설정">
      <SettingsPanel />
    </DashboardPage>
  );
}
