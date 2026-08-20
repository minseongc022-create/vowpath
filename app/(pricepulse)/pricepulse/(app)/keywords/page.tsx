import { getCurrentSeller } from "@/pricepulse/lib/dashboard/auth.ts";
import { listSellerTargets } from "@/pricepulse/lib/dashboard/seller-targets.ts";
import { formatDate } from "@/pricepulse/lib/dashboard/format.ts";

export default async function KeywordsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; error?: string }>;
}) {
  const params = await searchParams;
  const seller = await getCurrentSeller();
  const targets = seller ? await listSellerTargets(seller.sellerId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">키워드 관리</h1>
        <p className="text-sm text-slate-500">
          내가 파는 상품과 관련된 검색 키워드를 등록하면, 매일 순위·가격을 자동으로 추적합니다.
        </p>
      </div>

      {params.welcome ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          가입을 환영합니다! 아래에 첫 키워드를 등록해보세요. 등록한 다음 날부터 데이터가 쌓이기 시작합니다.
        </div>
      ) : null}

      <form action="/pricepulse/keywords/add" method="POST" className="flex gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <input
          type="text"
          name="query"
          placeholder="예: 무선이어폰"
          required
          maxLength={80}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          추가
        </button>
      </form>
      {params.error ? <p className="text-sm text-red-600">{decodeURIComponent(params.error)}</p> : null}

      {targets.length === 0 ? (
        <p className="text-sm text-slate-400">아직 등록한 키워드가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {targets.map((target) => (
            <li key={target.targetId} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{target.query}</p>
                <p className="text-xs text-slate-400">{formatDate(target.addedAt.slice(0, 10))} 등록</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`/pricepulse/rank?target=${target.targetId}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  순위 보기
                </a>
                <form action="/pricepulse/keywords/remove" method="POST">
                  <input type="hidden" name="targetId" value={target.targetId} />
                  <button type="submit" className="text-xs text-slate-400 hover:text-red-600">
                    삭제
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
