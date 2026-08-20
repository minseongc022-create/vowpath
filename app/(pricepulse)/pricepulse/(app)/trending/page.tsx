import Link from "next/link";
import { getTrending, getWatchlist, isDashboardDbConfigured } from "@/pricepulse/lib/dashboard/db.ts";
import { formatDate, formatDelta, formatKrw } from "@/pricepulse/lib/dashboard/format.ts";
import { EmptyState } from "@/components/pricepulse/EmptyState.tsx";

export default async function TrendingPage() {
  if (!isDashboardDbConfigured()) {
    return <EmptyState title="DB가 아직 연결되지 않았습니다" detail="pricepulse/README.md 참고." />;
  }

  const [rows, watchlist] = await Promise.all([getTrending(30), getWatchlist()]);
  const labelByTarget = new Map(watchlist.map((t) => [t.id, t.label ?? t.query]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">급상승</h1>
        <p className="text-sm text-slate-500">모든 키워드 중 전날 대비 순위가 가장 많이 오른 상품</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="아직 비교할 이틀치 데이터가 없습니다" detail="최소 2일 연속 수집되면 여기 표시됩니다." />
      ) : (
        <ol className="space-y-2">
          {rows.map((row, index) => (
            <li key={`${row.target_id}-${row.external_id}`} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
              <span className="w-6 text-center text-sm font-bold text-slate-300">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/pricepulse/prices/${row.external_id}`} className="block truncate text-sm font-medium text-blue-600 hover:underline">
                  {row.name}
                </Link>
                <p className="mt-0.5 text-xs text-slate-400">
                  {labelByTarget.get(row.target_id) ?? row.target_id} · {row.seller_name ?? "판매자 미상"} · {formatDate(row.observed_on)}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-emerald-600">▲ {row.rank_delta}</p>
                <p className="text-xs text-slate-400">
                  {row.rank_prev} → {row.rank_today}위
                </p>
              </div>
              <div className="w-24 text-right text-xs text-slate-500">
                <p className="font-medium text-slate-900">{formatKrw(row.price_today)}</p>
                <p>{formatDelta(row.price_delta, "원")}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
