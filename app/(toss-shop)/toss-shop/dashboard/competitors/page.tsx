import { redirect } from "next/navigation";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { CompetitorsPanel } from "@/toss-shop/components/CompetitorsPanel";

export default async function CompetitorsPage() {
  const session = await getTossShopSession();
  if (!session) redirect("/toss-shop/login");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">경쟁사 모니터링</h1>
      <p className="mt-1 text-sm text-ts-muted">경쟁 셀러의 가격·랭킹 변동을 추적하고 알림을 받습니다.</p>
      <div className="mt-6">
        <CompetitorsPanel />
      </div>
    </div>
  );
}
