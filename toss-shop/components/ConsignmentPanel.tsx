"use client";

import { useCallback, useState } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import type { ConsignmentPick } from "@/toss-shop/lib/types";
import { UpgradeBanner } from "@/toss-shop/components/UpgradeBanner";

export function ConsignmentPanel() {
  const [picks, setPicks] = useState<ConsignmentPick[]>([]);
  const [blocked, setBlocked] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/toss-shop/consignment");
    if (res.status === 402) {
      setBlocked(true);
      return;
    }
    const data = (await res.json()) as { picks: ConsignmentPick[] };
    setPicks(data.picks ?? []);
    setBlocked(false);
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  if (blocked) return <UpgradeBanner feature="위탁판매 AI 추천" />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-ts-primary/10 px-4 py-3 text-sm text-ts-ink ring-1 ring-ts-primary/20">
        <p className="font-bold">오늘의 위탁판매 5선</p>
        <p className="mt-1 text-ts-muted">
          토스쇼핑 시장 데이터 기반 · 경쟁가 자동 매칭 · 예상 마진·일일 수익
        </p>
      </div>

      {initialLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="ts-skeleton h-32 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {picks.map((p, i) => (
            <article key={p.id} className="ts-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-ts-primary">#{i + 1} · {p.keyword}</p>
                  <h3 className="mt-1 font-bold text-ts-ink">{p.productName}</h3>
                </div>
                <span className="ts-grade-badge ts-grade-good">{p.confidenceScore}점</span>
              </div>

              <div className="ts-metric-grid mt-4">
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">추천 판매가</p>
                  <p className="ts-metric-value text-lg">{formatKrw(p.recommendedPriceKrw)}</p>
                </div>
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">공급가</p>
                  <p className="ts-metric-value text-lg">{formatKrw(p.supplierCostKrw)}</p>
                </div>
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">예상 마진</p>
                  <p className="ts-metric-value text-lg">{p.estimatedMarginPct}%</p>
                </div>
                <div className="ts-metric-cell">
                  <p className="ts-metric-label">일 예상 수익</p>
                  <p className="ts-metric-value text-lg text-ts-primary">{formatKrw(p.estimatedDailyProfitKrw)}</p>
                </div>
              </div>

              {p.competitorPrices.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-ts-muted">경쟁 가격</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-ts-muted">
                    {p.competitorPrices.map((c) => (
                      <li key={c.sellerName} className="flex justify-between">
                        <span>{c.sellerName}</span>
                        <span>{formatKrw(c.priceKrw)} · #{c.rank}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-3 text-xs text-ts-muted">{p.reason}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
