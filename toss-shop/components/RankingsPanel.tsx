"use client";

import { useCallback, useEffect, useState } from "react";
import { formatKrw, formatRankDelta, categoryLabel } from "@/toss-shop/lib/format";
import type { CatalogProduct, WatchlistItem } from "@/toss-shop/lib/types";

type WatchlistEntry = WatchlistItem & { product?: CatalogProduct };

export function RankingsPanel() {
  const [rankings, setRankings] = useState<CatalogProduct[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [category, setCategory] = useState("");
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = category ? `?category=${category}` : "";
    const res = await fetch(`/api/toss-shop/rankings${qs}`);
    const data = (await res.json()) as { rankings: CatalogProduct[]; watchlist: WatchlistEntry[] };
    setRankings(data.rankings ?? []);
    setWatchlist(data.watchlist ?? []);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addWatch() {
    if (!productId.trim()) return;
    await fetch("/api/toss-shop/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: productId.trim(), alertPriceDropPct: 5 }),
    });
    setProductId("");
    void load();
  }

  async function removeWatch(id: string) {
    await fetch(`/api/toss-shop/rankings?id=${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="ts-input !w-auto"
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
            className="ts-input"
            placeholder="상품 ID (예: p001)"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />
          <button type="button" onClick={addWatch} className="ts-btn-primary shrink-0">
            추적 추가
          </button>
        </div>
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
                <div key={w.id} className="flex items-center justify-between rounded-xl bg-ts-bg px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">{w.product?.name ?? w.productId}</p>
                    <p className="text-xs text-ts-muted">
                      {w.product ? formatKrw(w.product.priceKrw) : ""} · 랭킹 {w.product?.rank} {label}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeWatch(w.id)} className="text-xs text-red-500">
                    삭제
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="ts-card overflow-x-auto">
        <h2 className="text-sm font-bold text-ts-ink">베스트셀러 랭킹</h2>
        {loading ? (
          <p className="mt-4 text-sm text-ts-muted">불러오는 중…</p>
        ) : (
          <table className="ts-table mt-4">
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
        )}
      </section>
    </div>
  );
}
