import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { SettlementsPanel } from "@/toss-shop/components/SettlementsPanel";

export default async function SettlementsPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">정산 대조</h1>
      <p className="mt-1 text-sm text-ts-muted">예상 정산금과 실제 입금액을 대조합니다.</p>
      <div className="mt-6">
        <SettlementsPanel />
      </div>
    </div>
  );
}
