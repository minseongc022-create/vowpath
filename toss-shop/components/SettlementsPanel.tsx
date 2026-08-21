"use client";

import { useCallback, useEffect, useState } from "react";
import { formatKrw } from "@/toss-shop/lib/format";
import type { SettlementRow } from "@/toss-shop/lib/types";

type Summary = {
  totalOrders: number;
  pendingCount: number;
  matchedCount: number;
  discrepancyCount: number;
  pendingPayoutKrw: number;
  matchedPayoutKrw: number;
  discrepancyKrw: number;
};

const SAMPLE_CSV = `order_id,order_date,product_name,gross_krw,platform_fee_krw,shipping_fee_krw
TS-20260815-001,2026-08-15,유기농 방울토마토 1kg,8900,712,0
TS-20260816-002,2026-08-16,친환경 주방세제 2L,12900,1032,2500`;

export function SettlementsPanel() {
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconcileId, setReconcileId] = useState("");
  const [actualPayout, setActualPayout] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/toss-shop/settlements");
    const data = (await res.json()) as { rows: SettlementRow[]; summary: Summary };
    setRows(data.rows ?? []);
    setSummary(data.summary ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function importCsv() {
    await fetch("/api/toss-shop/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", csv: SAMPLE_CSV }),
    });
    void load();
  }

  async function reconcile() {
    if (!reconcileId || !actualPayout) return;
    await fetch("/api/toss-shop/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reconcile",
        settlementId: reconcileId,
        actualPayoutKrw: Number(actualPayout),
      }),
    });
    setReconcileId("");
    setActualPayout("");
    void load();
  }

  const statusLabel = { pending: "대기", matched: "일치", discrepancy: "불일치" };
  const statusColor = {
    pending: "bg-amber-50 text-amber-700",
    matched: "bg-emerald-50 text-emerald-700",
    discrepancy: "bg-red-50 text-red-600",
  };

  return (
    <div className="space-y-6">
      {summary && (
        <div className="ts-stat-grid">
          <div className="ts-stat">
            <p className="text-[10px] font-bold text-ts-muted">정산 대기</p>
            <p className="text-lg font-bold">{formatKrw(summary.pendingPayoutKrw)}</p>
            <p className="text-[10px] text-ts-muted">{summary.pendingCount}건</p>
          </div>
          <div className="ts-stat">
            <p className="text-[10px] font-bold text-ts-muted">정산 완료</p>
            <p className="text-lg font-bold">{formatKrw(summary.matchedPayoutKrw)}</p>
            <p className="text-[10px] text-ts-muted">{summary.matchedCount}건</p>
          </div>
          <div className="ts-stat">
            <p className="text-[10px] font-bold text-ts-muted">불일치</p>
            <p className="text-lg font-bold text-red-600">{formatKrw(summary.discrepancyKrw)}</p>
            <p className="text-[10px] text-ts-muted">{summary.discrepancyCount}건</p>
          </div>
          <div className="ts-stat">
            <p className="text-[10px] font-bold text-ts-muted">전체 주문</p>
            <p className="text-lg font-bold">{summary.totalOrders}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={importCsv} className="ts-btn-secondary">
          샘플 CSV 가져오기
        </button>
      </div>

      <section className="ts-card">
        <h2 className="text-sm font-bold">정산 대조</h2>
        <p className="mt-1 text-xs text-ts-muted">실제 입금액을 입력하면 예상 정산금과 자동 대조합니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            className="ts-input !w-auto min-w-[200px]"
            value={reconcileId}
            onChange={(e) => setReconcileId(e.target.value)}
          >
            <option value="">주문 선택</option>
            {rows.filter((r) => r.status !== "matched").map((r) => (
              <option key={r.id} value={r.id}>{r.orderId} · {formatKrw(r.expectedPayoutKrw)}</option>
            ))}
          </select>
          <input
            className="ts-input !w-32"
            placeholder="실제 입금액"
            value={actualPayout}
            onChange={(e) => setActualPayout(e.target.value)}
          />
          <button type="button" onClick={reconcile} className="ts-btn-primary">
            대조하기
          </button>
        </div>
      </section>

      <section className="ts-card overflow-x-auto">
        <h2 className="text-sm font-bold">정산 내역</h2>
        {loading ? (
          <p className="mt-3 text-sm text-ts-muted">불러오는 중…</p>
        ) : (
          <table className="ts-table mt-4">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>상품</th>
                <th>판매가</th>
                <th>수수료</th>
                <th>예상 정산</th>
                <th>실제 입금</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.orderId}</td>
                  <td>{r.productName}</td>
                  <td>{formatKrw(r.grossKrw)}</td>
                  <td>{formatKrw(r.platformFeeKrw)}</td>
                  <td className="font-semibold">{formatKrw(r.expectedPayoutKrw)}</td>
                  <td>{r.actualPayoutKrw != null ? formatKrw(r.actualPayoutKrw) : "—"}</td>
                  <td>
                    <span className={`ts-badge ${statusColor[r.status]}`}>
                      {statusLabel[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
