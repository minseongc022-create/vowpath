import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { KeywordsPanel } from "@/toss-shop/components/KeywordsPanel";

export default async function KeywordsPage() {
  const session = await getTossShopSession();
  if (!session) redirect(SP_ROUTES.login);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">키워드 분석</h1>
      <p className="mt-1 text-sm text-ts-muted">검색량·경쟁도·상위 노출 상품을 분석합니다.</p>
      <div className="mt-6">
        <KeywordsPanel />
      </div>
    </div>
  );
}
