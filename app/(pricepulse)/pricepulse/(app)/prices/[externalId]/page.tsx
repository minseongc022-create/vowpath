import Link from "next/link";
import {
  getPriceHistory,
  getProductInfo,
  isDashboardDbConfigured,
} from "@/pricepulse/lib/dashboard/db.ts";
import { getCurrentSeller } from "@/pricepulse/lib/dashboard/auth.ts";
import { getSellerPlan } from "@/pricepulse/lib/dashboard/plan.ts";
import { formatDate, formatKrw } from "@/pricepulse/lib/dashboard/format.ts";
import { EmptyState } from "@/components/pricepulse/EmptyState.tsx";
import { UpgradeGate } from "@/components/pricepulse/UpgradeGate.tsx";
import { PriceHistoryChart } from "@/components/pricepulse/PriceHistoryChart.tsx";

export default async function PriceHistoryPage({
  params,
}: {
  params: Promise<{ externalId: string }>;
}) {
  if (!isDashboardDbConfigured()) {
    return <EmptyState title="DB가 아직 연결되지 않았습니다" detail="pricepulse/README.md 참고." />;
  }

  const seller = await getCurrentSeller();
  const planInfo = seller ? await getSellerPlan(seller.sellerId) : null;
  if (planInfo?.plan !== "pro") return <UpgradeGate feature="가격 히스토리" />;

  const { externalId } = await params;
  const [product, history] = await Promise.all([
    getProductInfo(externalId),
    getPriceHistory(externalId),
  ]);

  const latest = history[history.length - 1];

  return (
    <div className="space-y-6">
      <Link href="/pricepulse/rank" className="text-xs text-slate-400 hover:text-slate-600">
        ← 순위 추적으로
      </Link>

      <div>
        <h1 className="text-lg font-bold text-slate-900">{product?.name ?? `상품 ${externalId}`}</h1>
        <p className="text-sm text-slate-500">
          {product?.seller_name ?? "판매자 미상"}
          {product?.product_url ? (
            <>
              {" · "}
              <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                토스쇼핑에서 보기 ↗
              </a>
            </>
          ) : null}
        </p>
      </div>

      {history.length === 0 ? (
        <EmptyState title="이 상품의 가격 기록이 없습니다" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">현재가</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatKrw(latest.price)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">현재 순위</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{latest.rank}위</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400">상태</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{latest.sold_out ? "품절" : "판매중"}</p>
            </div>
          </div>

          <PriceHistoryChart rows={history} />

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                  <th className="px-4 py-2 font-medium">일자</th>
                  <th className="px-4 py-2 text-right font-medium">가격</th>
                  <th className="px-4 py-2 text-right font-medium">정가</th>
                  <th className="px-4 py-2 text-right font-medium">순위</th>
                  <th className="px-4 py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((row) => (
                  <tr key={row.observed_on} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 text-xs text-slate-500">{formatDate(row.observed_on)}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">{formatKrw(row.price)}</td>
                    <td className="px-4 py-2 text-right text-slate-400">{formatKrw(row.list_price)}</td>
                    <td className="px-4 py-2 text-right text-slate-500">{row.rank}</td>
                    <td className="px-4 py-2 text-xs text-slate-400">{row.sold_out ? "품절" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
