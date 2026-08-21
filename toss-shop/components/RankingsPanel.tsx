"use client";

import { useCallback, useEffect, useState } from "react";
import { formatKrw, formatRankDelta, categoryLabel } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { CatalogProduct, WatchlistItem } from "@/toss-shop/lib/types";

type WatchlistEntry = WatchlistItem & { product?: CatalogProduct };

type Tab = "tracking" | "bestseller";

export function RankingsPanel() {
  const [tab, setTab] = useState<Tab>("tracking");
  const [rankings, setRankings] = useState<CatalogProduct[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [category, setCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    const qs = category ? `?category=${category}` : "";
    const res = await fetch(`/api/toss-shop/rankings${qs}`);
    const data = (await res.json()) as { rankings: CatalogProduct[]; watchlist: WatchlistEntry[] };
    setRankings(data.rankings ?? []);
    setWatchlist(data.watchlist ?? []);
  }, [category]);

  const { initialLoading } = useSilentFetch(fetchData);

  useEffect(() => {
    if (!selectedProduct && rankings[0]) {
      setSelectedProduct(rankings[0].id);
    }
  }, [rankings, selectedProduct]);

  async function addTrack() {
    if (!selectedProduct || busy) return;
    setBusy(true);
    try {
      await fetch("/api/toss-shop/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct,
          keyword: keyword.trim() || undefined,
          alertPriceDropPct: 5,
        }),
      });
      setKeyword("");
      await fetchData();
      setTab("tracking");
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
      <div className="ts-tab-bar">
        <button type="button" onClick={() => setTab("tracking")} className={tab === "tracking" ? "ts-tab ts-tab-active" : "ts-tab"}>
          랭킹 추적 ({watchlist.length})
        </button>
        <button type="button" onClick={() => setTab("bestseller")} className={tab === "bestseller" ? "ts-tab ts-tab-active" : "ts-tab"}>
          베스트셀러
        </button>
      </div>

      {tab === "tracking" && (
        <>
          <section className="ts-card-compact">
            <h2 className="ts-section-title">상품 랭킹 추적 추가</h2>
            <p className="ts-section-desc">내 상품이 토스쇼핑에서 어떤 키워드로 몇 위에 노출되는지 추적합니다.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="ts-label" htmlFor="track-product">상품 선택</label>
                <select
                  id="track-product"
                  className="ts-input"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  {rankings.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ts-label" htmlFor="track-keyword">키워드 (선택)</label>
                <input
                  id="track-keyword"
                  className="ts-input"
                  placeholder="예: 방울토마토"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void addTrack()}
                />
              </div>
              <button type="button" onClick={() => void addTrack()} disabled={busy || !selectedProduct} className="ts-btn-primary">
                추적 시작
              </button>
            </div>
          </section>

          <section className="ts-card overflow-hidden !p-0">
            <div className="border-b border-ts-border px-4 py-3">
              <h2 className="ts-section-title">내 추적 상품</h2>
            </div>

            {initialLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2].map((i) => <div key={i} className="ts-skeleton h-14 w-full" />)}
              </div>
            ) : watchlist.length === 0 ? (
              <p className="p-4 text-sm text-ts-muted">추적 중인 상품이 없습니다. 위에서 상품을 선택해 추가하세요.</p>
            ) : (
              <>
                <div className="hidden sm:block">
                  <table className="ts-data-table">
                    <thead>
                      <tr>
                        <th>상품명</th>
                        <th>키워드</th>
                        <th>노출순위</th>
                        <th>가격</th>
                        <th>리뷰</th>
                        <th>변동</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {watchlist.map((w) => {
                        const { label, delta } = w.product
                          ? formatRankDelta(w.product.rank, w.product.rankPrev)
                          : { label: "—", delta: 0 };
                        return (
                          <tr key={w.id}>
                            <td className="max-w-[180px] truncate font-medium">{w.product?.name ?? w.productId}</td>
                            <td className="text-ts-muted">{w.keyword ?? "—"}</td>
                            <td className="font-bold text-ts-primary">#{w.product?.rank ?? "—"}</td>
                            <td>{w.product ? formatKrw(w.product.priceKrw) : "—"}</td>
                            <td>{w.product?.reviewCount.toLocaleString() ?? "—"}</td>
                            <td>
                              <span className={delta > 0 ? "ts-badge-up" : delta < 0 ? "ts-badge-down" : "ts-badge-neutral"}>
                                {label}
                              </span>
                            </td>
                            <td>
                              <button type="button" onClick={() => void removeWatch(w.id)} className="text-xs text-red-500">
                                삭제
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-ts-border sm:hidden">
                  {watchlist.map((w) => {
                    const { label, delta } = w.product
                      ? formatRankDelta(w.product.rank, w.product.rankPrev)
                      : { label: "—", delta: 0 };
                    return (
                      <div key={w.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ts-ink">{w.product?.name ?? w.productId}</p>
                            {w.keyword && <p className="text-xs text-ts-primary">{w.keyword}</p>}
                          </div>
                          <button type="button" onClick={() => void removeWatch(w.id)} className="shrink-0 text-xs text-red-500">
                            삭제
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="font-bold text-ts-primary">#{w.product?.rank ?? "—"}</span>
                          <span>{w.product ? formatKrw(w.product.priceKrw) : ""}</span>
                          <span className={delta > 0 ? "ts-badge-up" : delta < 0 ? "ts-badge-down" : "ts-badge-neutral"}>
                            {label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </>
      )}

      {tab === "bestseller" && (
        <section className="ts-card overflow-hidden !p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-ts-border px-4 py-3">
            <h2 className="ts-section-title flex-1">베스트셀러 랭킹</h2>
            <select
              className="ts-select-compact"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">전체</option>
              {["food", "beauty", "home", "digital", "fashion", "health"].map((c) => (
                <option key={c} value={c}>{categoryLabel(c)}</option>
              ))}
            </select>
          </div>

          {initialLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => <div key={i} className="ts-skeleton h-14 w-full" />)}
            </div>
          ) : (
            <div className="divide-y divide-ts-border">
              {rankings.map((p) => {
                const { label, delta } = formatRankDelta(p.rank, p.rankPrev);
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ts-bg text-sm font-bold text-ts-primary">
                      {p.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ts-ink">{p.name}</p>
                      <p className="text-xs text-ts-muted">{p.sellerName} · {categoryLabel(p.category)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{formatKrw(p.priceKrw)}</p>
                      <span className={delta > 0 ? "ts-badge-up" : delta < 0 ? "ts-badge-down" : "ts-badge-neutral"}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
