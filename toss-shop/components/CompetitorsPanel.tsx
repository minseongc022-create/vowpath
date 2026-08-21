"use client";

import { useCallback, useState } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import { useLivePoll } from "@/toss-shop/lib/hooks/use-live-poll";
import { SP_STRINGS } from "@/toss-shop/lib/strings";
import type { CatalogProduct, Competitor, CompetitorAlert, CompetitorAlertRule } from "@/toss-shop/lib/types";

type EnrichedCompetitor = Competitor & { products: CatalogProduct[] };

export function CompetitorsPanel() {
  const [competitors, setCompetitors] = useState<EnrichedCompetitor[]>([]);
  const [alerts, setAlerts] = useState<CompetitorAlert[]>([]);
  const [rules, setRules] = useState<CompetitorAlertRule[]>([]);
  const [sellerName, setSellerName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/toss-shop/competitors");
    const data = (await res.json()) as {
      competitors: EnrichedCompetitor[];
      alerts: CompetitorAlert[];
      rules: CompetitorAlertRule[];
    };
    setCompetitors(data.competitors ?? []);
    setAlerts(data.alerts ?? []);
    setRules(data.rules ?? []);
    setLoading(false);
  }, []);

  useLivePoll(() => {
    void load();
  });

  async function addCompetitor() {
    if (!sellerName.trim()) return;
    await fetch("/api/toss-shop/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_competitor", sellerName: sellerName.trim() }),
    });
    setSellerName("");
    void load();
  }

  async function removeCompetitor(id: string) {
    await fetch(`/api/toss-shop/competitors?id=${id}`, { method: "DELETE" });
    void load();
  }

  async function markRead(alertId: string) {
    await fetch("/api/toss-shop/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", alertId }),
    });
    void load();
  }

  const unread = alerts.filter((a) => !a.read);

  return (
    <div className="space-y-6">
      <p className="text-xs text-ts-muted">{SP_STRINGS.syncInterval} · 탭이 열려 있으면 자동 새로고침</p>
      <div className="flex gap-2">
        <input
          className="ts-input"
          placeholder="경쟁 셀러명 (예: 과일나라)"
          value={sellerName}
          onChange={(e) => setSellerName(e.target.value)}
        />
        <button type="button" onClick={addCompetitor} className="ts-btn-primary shrink-0">
          경쟁사 추가
        </button>
      </div>

      {unread.length > 0 && (
        <section className="ts-card border-amber-200 bg-amber-50">
          <h2 className="text-sm font-bold text-amber-800">새 알림 ({unread.length})</h2>
          <ul className="mt-2 space-y-2">
            {unread.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
                <span>{a.message}</span>
                <button type="button" onClick={() => markRead(a.id)} className="shrink-0 text-xs text-ts-primary">
                  확인
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="ts-card">
          <h2 className="text-sm font-bold">추적 경쟁사</h2>
          {loading ? (
            <p className="mt-3 text-sm text-ts-muted">불러오는 중…</p>
          ) : competitors.length === 0 ? (
            <p className="mt-3 text-sm text-ts-muted">경쟁 셀러를 추가하세요.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {competitors.map((c) => (
                <li key={c.id} className="rounded-xl bg-ts-bg p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{c.sellerName}</p>
                    <button type="button" onClick={() => removeCompetitor(c.id)} className="text-xs text-red-500">
                      삭제
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-ts-muted">
                    {c.products.slice(0, 3).map((p) => (
                      <li key={p.id}>{p.name} · {formatKrw(p.priceKrw)} · #{p.rank}</li>
                    ))}
                    {c.products.length === 0 && <li>등록 상품 없음</li>}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ts-card">
          <h2 className="text-sm font-bold">알림 규칙 ({rules.length})</h2>
          <p className="mt-1 text-xs text-ts-muted">가격·랭킹 변동 시 자동 알림 ({SP_STRINGS.syncInterval})</p>
          <ul className="mt-3 space-y-2 text-sm">
            {rules.map((r) => {
              const comp = competitors.find((c) => c.id === r.competitorId);
              const metricLabel = {
                price_drop: "가격 하락",
                price_rise: "가격 상승",
                rank_up: "랭킹 상승",
                rank_down: "랭킹 하락",
                new_product: "신규 상품",
              }[r.metric];
              return (
                <li key={r.id} className="rounded-lg bg-ts-bg px-3 py-2">
                  <span className="font-medium">{comp?.sellerName ?? r.competitorId}</span>
                  <span className="text-ts-muted"> · {metricLabel} {r.threshold ?? ""}%</span>
                  <span className={r.enabled ? " text-emerald-600" : " text-ts-muted"}>
                    {r.enabled ? " · 활성" : " · 비활성"}
                  </span>
                </li>
              );
            })}
          </ul>

          <h3 className="mt-4 text-xs font-bold text-ts-muted">알림 이력</h3>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
            {alerts.slice(0, 20).map((a) => (
              <li key={a.id} className={a.read ? "text-ts-muted" : "font-medium text-ts-ink"}>
                {a.message}
              </li>
            ))}
            {alerts.length === 0 && <li className="text-ts-muted">아직 알림 없음</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
