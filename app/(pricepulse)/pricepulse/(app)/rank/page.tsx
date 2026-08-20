import Link from "next/link";
import {
  getCollectedTargetIds,
  getRankBoard,
  isDashboardDbConfigured,
  type RankRow,
} from "@/pricepulse/lib/dashboard/db.ts";
import { getCurrentSeller } from "@/pricepulse/lib/dashboard/auth.ts";
import { listSellerTargets } from "@/pricepulse/lib/dashboard/seller-targets.ts";
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

  const seller = await getCurrentSeller();
  const watchlist = seller ? await listSellerTargets(seller.sellerId) : [];
  if (!watchlist.length) {
    return (
      <EmptyState
        title="아직 등록한 키워드가 없습니다"
        detail="키워드 관리에서 내 상품과 관련된 검색어를 등록하면 다음 수집부터 추적이 시작됩니다."
        actionHref="/pricepulse/keywords"
        actionLabel="키워드 등록하러 가기"
      />
    );
  }

  const collected = await getCollectedTargetIds();
  const params = await searchParams;
  const targetId = params.target && watchlist.some((t) => t.targetId === params.target)
    ? params.target
    : watchlist[0].targetId;
  const target = watchlist.find((t) => t.targetId === targetId)!;

  const rows = collected.has(targetId) ? await getRankBoard(targetId) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {watchlist.map((t) => {
          const active = t.targetId === targetId;
          const has = collected.has(t.targetId);
          return (
            <Link
              key={t.targetId}
              href={`/pricepulse/rank?target=${t.targetId}`}
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
          detail="키워드를 등록한 다음 날부터 데이터가 표시됩니다 (하루 1회 수집)."
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
