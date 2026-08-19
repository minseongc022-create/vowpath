"use client";

import { useCallback, useEffect, useState } from "react";
import { orderStatusLabelKo } from "@/giu/lib/order-status";
import { riskLevelLabelKo } from "@/giu/lib/risk-profile";
import type { GiuOrderStatusLog, GiuReservation } from "@/giu/lib/types";

type OrderRow = {
  reservation: GiuReservation;
  customerRisk: { level: string; reasons: string[] };
  merchantRisk: { level: string; reasons: string[] };
  logs: GiuOrderStatusLog[];
  chatCount: number;
};

export default function GiuAdminDisputePage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<"customer_fault" | "merchant_fault" | "needs_more_info" | "no_issue">("needs_more_info");

  const load = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/giu/admin/disputes?orders=1", {
        headers: { "x-giu-admin-key": key },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { orders?: OrderRow[] };
      setOrders(data.orders ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("giu-admin-key") : "";
    if (saved) {
      setAdminKey(saved);
      void load(saved);
    } else {
      setLoading(false);
    }
  }, [load]);

  async function saveKey() {
    window.localStorage.setItem("giu-admin-key", adminKey);
    await load(adminKey);
  }

  async function resolve() {
    if (!selected || !reason.trim()) return;
    const res = await fetch("/api/giu/admin/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-giu-admin-key": adminKey },
      body: JSON.stringify({
        reservationId: selected.reservation.id,
        outcome,
        reason,
      }),
    });
    if (res.ok) {
      setReason("");
      await load(adminKey);
    }
  }

  return (
    <div className="giu-page mx-auto max-w-3xl space-y-4">
      <h1 className="text-[20px] font-extrabold text-giu-ink">지우쿠 분쟁센터</h1>
      <div className="giu-card flex gap-2">
        <input
          type="password"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="관리자 키"
          className="giu-input flex-1 text-[13px]"
        />
        <button type="button" onClick={() => void saveKey()} className="giu-btn-primary !px-4 text-[13px]">
          접속
        </button>
      </div>

      {loading ? <p className="text-[13px] text-giu-muted">불러오는 중…</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <ul className="space-y-2">
          {orders.map((row) => (
            <li key={row.reservation.id}>
              <button
                type="button"
                onClick={() => setSelected(row)}
                className={`giu-card-flat w-full p-3 text-left ring-1 ${
                  selected?.reservation.id === row.reservation.id ? "ring-giu-primary" : "ring-giu-border"
                }`}
              >
                <p className="text-[14px] font-bold">{row.reservation.customerName}</p>
                <p className="text-[12px] text-giu-muted">
                  {orderStatusLabelKo(row.reservation.status)} · {row.reservation.code}
                </p>
                <p className="text-[11px] text-giu-muted">
                  고객 {riskLevelLabelKo(row.customerRisk.level as "normal")} · 가게{" "}
                  {riskLevelLabelKo(row.merchantRisk.level as "normal")}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <div className="giu-card space-y-3">
            <p className="text-[15px] font-bold">주문 기록</p>
            <ol className="max-h-64 space-y-2 overflow-y-auto text-[12px]">
              {selected.logs.map((log) => (
                <li key={log.id} className="border-l-2 border-giu-primary/20 pl-2">
                  {new Date(log.changedAt).toLocaleString("ko-KR")} ·{" "}
                  {log.fromStatus ? orderStatusLabelKo(log.fromStatus) : "—"} →{" "}
                  {orderStatusLabelKo(log.toStatus)}
                  {log.reason ? ` · ${log.reason}` : ""}
                </li>
              ))}
            </ol>
            <p className="text-[12px] text-giu-muted">채팅 {selected.chatCount}건</p>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as typeof outcome)}
              className="giu-input text-[13px]"
            >
              <option value="customer_fault">고객 책임</option>
              <option value="merchant_fault">가게 책임</option>
              <option value="needs_more_info">추가 확인 필요</option>
              <option value="no_issue">문제 없음</option>
            </select>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="처리 사유"
              className="giu-input min-h-[72px] resize-none text-[13px]"
            />
            <button type="button" onClick={() => void resolve()} className="giu-btn-primary w-full !py-2.5 text-[13px]">
              분쟁 처리 기록
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
