import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { SettingsPanel } from "@/toss-shop/components/SettingsPanel";

export default async function SettingsPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">설정</h1>
      <p className="mt-1 text-sm text-ts-muted">API 연동 및 플랜 관리</p>
      <div className="mt-6">
        <SettingsPanel />
      </div>
    </div>
  );
}
