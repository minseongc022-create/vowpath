import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { RankingsPanel } from "@/toss-shop/components/RankingsPanel";

export default async function RankingsPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">랭킹·가격 추적</h1>
      <p className="mt-1 text-sm text-ts-muted">베스트셀러 순위와 가격 변동을 모니터링합니다.</p>
      <div className="mt-6">
        <RankingsPanel />
      </div>
    </div>
  );
}
