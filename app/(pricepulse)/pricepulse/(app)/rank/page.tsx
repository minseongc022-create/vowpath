import Link from "next/link";
import {
  getCollectedTargetIds,
  getRankBoard,
  getWatchlist,
  isDashboardDbConfigured,
  type RankRow,
} from "@/pricepulse/lib/dashboard/db.ts";
import { formatDate, formatDelta, formatKrw, rankDeltaTone } from "@/pricepulse/lib/dashboard/format.ts";
import { EmptyState } from "@/components/pricepulse/EmptyState.tsx";

function RankDelta({ value }: { value: number | null }) {
  const tone = rankDeltaTone(value);
  const cls =
    tone === "up" ? "text-emerald-600" : tone === "down" ? "text-red-600" : "text-slate-400";
  const arrow = tone === "up" ? "▲" : tone === "down" ? "▼" : "–";
  return (
    <span className={`text-xs font-medium ${cls}`}>
      {value ? `${arrow} ${Math.abs(value)}` : "신규"}
    </span>
  );
}

export default async function RankPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  if (!isDashboardDbConfigured()) {
    return <EmptyState title="DB가 아직 연결되지 않았습니다" detail="PRICEPULSE_SUPABASE_URL / PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY를 설정하세요. pricepulse/README.md 참고." />;
  }

  const [watchlist, collected] = await Promise.all([getWatchlist(), getCollectedTargetIds()]);
  if (!watchlist.length) {
    return <EmptyState title="추적 중인 키워드가 없습니다" detail="pricepulse/config/targets.json에 타깃을 추가하세요." />;
  }

  const params = await searchParams;
  const targetId = params.target && watchlist.some((t) => t.id === params.target)
    ? params.target
    : watchlist[0].id;
  const target = watchlist.find((t) => t.id === targetId)!;

  const rows = collected.has(targetId) ? await getRankBoard(targetId) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {watchlist.map((t) => {
          const active = t.id === targetId;
          const has = collected.has(t.id);
          return (
            <Link
              key={t.id}
              href={`/pricepulse/rank?target=${t.id}`}
              className={
                active
                  ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                  : `rounded-full px-3 py-1 text-xs font-medium ${has ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-50 text-slate-300"}`
              }
            >
              {t.label ?? t.query}
              {!has ? " ·" : ""}
            </Link>
          );
        })}
      </div>

      <div>
        <h1 className="text-lg font-bold text-slate-900">{target.label ?? target.query}</h1>
        <p className="text-sm text-slate-500">검색어 “{target.query}” — 최신 수집일 기준 순위</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="아직 이 키워드의 수집 데이터가 없습니다"
          detail="npm run pricepulse:collect 를 실행했는지, 프로필이 verified 상태인지 확인하세요."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                <th className="px-4 py-2 font-medium">순위</th>
                <th className="px-4 py-2 font-medium">변동</th>
                <th className="px-4 py-2 font-medium">상품</th>
                <th className="px-4 py-2 font-medium">판매자</th>
                <th className="px-4 py-2 text-right font-medium">가격</th>
                <th className="px-4 py-2 text-right font-medium">변동가</th>
                <th className="px-4 py-2 font-medium">수집일</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: RankRow) => (
                <tr key={row.external_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{row.rank_today}</td>
                  <td className="px-4 py-2.5">
                    <RankDelta value={row.rank_delta} />
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5">
                    <Link href={`/pricepulse/prices/${row.external_id}`} className="text-blue-600 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{row.seller_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">{formatKrw(row.price_today)}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-slate-500">
                    {formatDelta(row.price_delta, "원")}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{formatDate(row.observed_on)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
