"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";
import { findByToken, loadState, saveState, withActivity } from "@/lib/store";
import { formatWon, lineTotal, orderTotal, type ChangeOrder, type Project } from "@/lib/types";

export default function ClientApprovePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const [order, setOrder] = useState<ChangeOrder | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [company, setCompany] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const hit = findByToken(token);
    if (!hit) {
      setOrder(null);
      return;
    }
    setOrder(hit.order);
    setProject(hit.project);
    setCompany(hit.state.profile.companyName);
    if (hit.order.status === "승인") setDone("이미 승인되었습니다.");
    if (hit.order.status === "거절") setDone("이미 거절되었습니다.");
  }, [token]);

  function decide(ok: boolean) {
    if (!order) return;
    const state = loadState();
    const nextOrders = state.orders.map((o) => {
      if (o.token !== token && o.id !== order.id) return o;
      return {
        ...o,
        status: ok ? ("승인" as const) : ("거절" as const),
        decidedAt: new Date().toISOString(),
      };
    });
    // ensure demo token exists in state
    let orders = nextOrders;
    if (!state.orders.some((o) => o.token === token || o.id === order.id)) {
      orders = [
        {
          ...order,
          status: ok ? "승인" : "거절",
          decidedAt: new Date().toISOString(),
        },
        ...state.orders,
      ];
    }
    const next = withActivity(
      { ...state, orders },
      `${project?.name || "현장"} CO#${order.number} ${ok ? "승인" : "거절"}`,
    );
    saveState(next);
    setOrder({ ...order, status: ok ? "승인" : "거절" });
    setDone(ok ? "승인했습니다. 감사합니다." : "거절했습니다. 시공사에 연락해 주세요.");
  }

  if (!order || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh-hero px-4">
        <div className="sc-card max-w-md p-6 text-center">
          <p className="font-display text-xl text-ink">링크를 확인할 수 없습니다</p>
          <p className="mt-2 text-sm text-ink-muted">만료되었거나 잘못된 주소입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-hero">
      <header className="border-b border-paper-line bg-paper-card/90">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <p className="font-display text-lg text-ink">{SITE.name}</p>
          <p className="text-xs text-ink-muted">추가공사 승인</p>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-xs font-semibold tracking-wide text-steel-700">{company}</p>
        <h1 className="mt-2 font-display text-2xl text-ink">
          {project.name} · CO #{order.number}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{order.title}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{order.reason}</p>
        {order.photoNote ? (
          <p className="mt-2 rounded-xl bg-signal-soft px-3 py-2 text-xs text-signal-ink">현장: {order.photoNote}</p>
        ) : null}

        <div className="mt-6 sc-card p-4">
          <p className="text-sm font-semibold text-ink">내역</p>
          <ul className="mt-3 space-y-2 text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 text-ink-muted">
                <span>
                  {i.name} · {i.qty}
                  {i.unit}
                </span>
                <span className="shrink-0 font-medium text-ink">{formatWon(lineTotal(i))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-paper-line pt-3 text-right font-display text-xl text-ink">
            합계 {formatWon(orderTotal(order))}
          </p>
          {order.daysExtend > 0 ? (
            <p className="mt-1 text-right text-xs text-ink-muted">공기 +{order.daysExtend}일</p>
          ) : null}
        </div>

        {done ? (
          <p className="mt-8 rounded-2xl border border-steel-100 bg-steel-50 px-4 py-6 text-center text-sm font-medium text-steel-800">
            {done}
          </p>
        ) : (
          <div className="mt-8 space-y-3">
            <button type="button" className="sc-btn-primary w-full py-4" onClick={() => decide(true)}>
              위 금액으로 승인합니다
            </button>
            <button type="button" className="sc-btn-secondary w-full py-4" onClick={() => decide(false)}>
              거절합니다
            </button>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-ink-muted">
          이 페이지는 {company}의 추가공사 합의용입니다. {SITE.name}
        </p>
      </main>
    </div>
  );
}
