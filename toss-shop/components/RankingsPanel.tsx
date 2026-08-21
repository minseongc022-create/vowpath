"use client";

import { useCallback, useState } from "react";
import { formatKrw, formatRankDelta, categoryLabel } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { CatalogProduct, WatchlistItem } from "@/toss-shop/lib/types";

type WatchlistEntry = WatchlistItem & { product?: CatalogProduct };

export function RankingsPanel() {
  const [rankings, setRankings] = useState<CatalogProduct[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [category, setCategory] = useState("");
  const [productId, setProductId] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    const qs = category ? `?category=${category}` : "";
    const res = await fetch(`/api/toss-shop/rankings${qs}`);
    const data = (await res.json()) as { rankings: CatalogProduct[]; watchlist: WatchlistEntry[] };
    setRankings(data.rankings ?? []);
    setWatchlist(data.watchlist ?? []);
  }, [category]);

  const { initialLoading, refreshing } = useSilentFetch(fetchData);

  async function addWatch() {
    if (!productId.trim() || busy) return;
    setBusy(true);
    try {
      await fetch("/api/toss-shop/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productId.trim(), alertPriceDropPct: 5 }),
      });
      setProductId("");
      await fetchData();
    } finally {
      setBusy(false);
    }
  }

  async function removeWatch(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/toss-shop/rankings?id=${id}`, { method: "DELETE" });
      await fetchData();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          className="ts-input sm:!w-40"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">전체 카테고리</option>
          {["food", "beauty", "home", "digital", "fashion", "health"].map((c) => (
            <option key={c} value={c}>{categoryLabel(c)}</option>
          ))}
        </select>
        <div className="flex flex-1 gap-2">
          <input
            className="ts-input min-w-0 flex-1"
            placeholder="상품 ID (예: p001)"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addWatch()}
          />
          <button type="button" onClick={addWatch} disabled={busy} className="ts-btn-primary shrink-0">
            추적
          </button>
        </div>
        {refreshing && (
          <span className="hidden text-xs text-ts-muted sm:inline-flex sm:items-center sm:gap-1">
            <span className="ts-refresh-dot ts-refresh-dot-pulse" aria-hidden />
          </span>
        )}
      </div>

      {watchlist.length > 0 && (
        <section className="ts-card">
          <h2 className="text-sm font-bold text-ts-ink">내 추적 상품 ({watchlist.length})</h2>
          <div className="mt-3 space-y-2">
            {watchlist.map((w) => {
              const { label } = w.product
                ? formatRankDelta(w.product.rank, w.product.rankPrev)
                : { label: "—" };
              return (
                <div key={w.id} className="flex items-center justify-between gap-2 rounded-xl bg-ts-bg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{w.product?.name ?? w.productId}</p>
                    <p className="text-xs text-ts-muted">
                      {w.product ? formatKrw(w.product.priceKrw) : ""} · #{w.product?.rank} {label}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeWatch(w.id)} className="shrink-0 text-xs text-red-500">
                    삭제
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="ts-card">
        <h2 className="text-sm font-bold text-ts-ink">베스트셀러 랭킹</h2>

        {initialLoading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="ts-skeleton h-14 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-2 sm:hidden">
              {rankings.map((p) => {
                const { label, delta } = formatRankDelta(p.rank, p.rankPrev);
                return (
                  <div key={p.id} className="ts-product-row">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ts-primary">#{p.rank}</p>
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-xs text-ts-muted">{p.sellerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatKrw(p.priceKrw)}</p>
                      <span className={delta > 0 ? "ts-badge-up" : delta < 0 ? "ts-badge-down" : "ts-badge-neutral"}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="ts-table-wrap mt-4 hidden sm:block">
              <table className="ts-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>상품</th>
                    <th>카테고리</th>
                    <th>가격</th>
                    <th>리뷰</th>
                    <th>변동</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((p) => {
                    const { label, delta } = formatRankDelta(p.rank, p.rankPrev);
                    return (
                      <tr key={p.id}>
                        <td className="font-bold">{p.rank}</td>
                        <td>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-ts-muted">{p.sellerName} · {p.id}</p>
                        </td>
                        <td>{categoryLabel(p.category)}</td>
                        <td>{formatKrw(p.priceKrw)}</td>
                        <td>{p.reviewCount.toLocaleString()}</td>
                        <td>
                          <span className={delta > 0 ? "ts-badge-up" : delta < 0 ? "ts-badge-down" : "ts-badge-neutral"}>
                            {label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
