"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell, Toast } from "@/components/SiteChrome";
import { getPlan } from "@/lib/plans";
import { approveUrl, nextCoNumber, withActivity } from "@/lib/store";
import { formatWon, lineTotal, newToken, orderTotal, type ChangeOrder, type LineItem } from "@/lib/types";
import { useAppState } from "@/lib/useAppState";

export default function NewCoInner() {
  const { ready, state, commit, toast } = useAppState();
  const params = useSearchParams();
  const preset = params.get("project") || "";

  const [projectId, setProjectId] = useState(preset);
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [daysExtend, setDaysExtend] = useState("0");
  const [photoNote, setPhotoNote] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: "n1", name: "", qty: 1, unit: "식", unitPrice: 0 },
  ]);
  const [created, setCreated] = useState<ChangeOrder | null>(null);

  const draftTotal = useMemo(() => items.reduce((s, i) => s + lineTotal(i), 0), [items]);

  if (!ready || !state) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>;
  }

  const plan = getPlan(state.profile.plan);
  const cosThisMonth = state.orders.length;

  function addLine() {
    setItems((prev) => [...prev, { id: `n_${Date.now()}`, name: "", qty: 1, unit: "식", unitPrice: 0 }]);
  }

  function save(send: boolean) {
    const pid = projectId || state!.projects[0]?.id;
    if (!pid || !title.trim()) {
      commit(state!, "현장과 제목이 필요합니다");
      return;
    }
    if (cosThisMonth >= plan.cosPerMonth) {
      commit(state!, `이번 달 한도 ${plan.cosPerMonth}건`);
      return;
    }
    const cleanItems = items
      .filter((i) => i.name.trim())
      .map((i) => ({
        ...i,
        name: i.name.trim(),
        qty: Number(i.qty) || 1,
        unitPrice: Number(i.unitPrice) || 0,
      }));
    if (!cleanItems.length) {
      commit(state!, "품목을 한 줄 이상 넣으세요");
      return;
    }
    const order: ChangeOrder = {
      id: `co_${Date.now()}`,
      projectId: pid,
      number: nextCoNumber(state!, pid),
      title: title.trim(),
      reason: reason.trim() || "발주자 요청",
      items: cleanItems,
      daysExtend: Math.max(0, Number(daysExtend) || 0),
      status: send ? "보냄" : "작성중",
      token: newToken(),
      createdAt: new Date().toISOString(),
      sentAt: send ? new Date().toISOString() : undefined,
      photoNote: photoNote.trim() || undefined,
    };
    const next = withActivity(
      { ...state!, orders: [order, ...state!.orders] },
      `${order.title} ${send ? "보냄" : "작성"} · ${formatWon(orderTotal(order))}`,
    );
    commit(next, send ? "승인 링크 준비됨" : "임시 저장");
    setCreated(order);
  }

  if (created) {
    const url = approveUrl(created.token);
    return (
      <DashboardShell companyName={state.profile.companyName}>
        <Toast message={toast} />
        <div className="mx-auto max-w-lg sc-card p-6 text-center">
          <p className="text-xs font-semibold text-steel-700">완료</p>
          <h1 className="mt-2 font-display text-2xl text-ink">변경합의 CO #{created.number}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {created.title} · {formatWon(orderTotal(created))}
          </p>
          <p className="mt-4 break-all rounded-xl bg-paper px-3 py-3 text-xs font-medium text-steel-700">{url}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" className="sc-btn-primary" onClick={() => navigator.clipboard.writeText(url)}>
              링크 복사 (카톡에 붙여넣기)
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="sc-btn-secondary">
              고객 화면 미리보기
            </a>
            <button type="button" className="sc-btn-ghost" onClick={() => setCreated(null)}>
              하나 더 만들기
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell companyName={state.profile.companyName}>
      <Toast message={toast} />
      <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">변경 만들기</h1>
      <p className="mt-2 text-sm text-ink-muted">금액·사유·공기연장을 넣고 고객 승인 링크를 만듭니다.</p>

      <div className="mt-8 max-w-2xl space-y-4">
        <div className="sc-card p-5">
          <label className="sc-label" htmlFor="project">
            현장
          </label>
          <select
            id="project"
            className="sc-input"
            value={projectId || state.projects[0]?.id || ""}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.clientName})
              </option>
            ))}
          </select>
          <label className="sc-label mt-4" htmlFor="title">
            변경 제목
          </label>
          <input
            id="title"
            className="sc-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 욕실 타일 업그레이드"
            required
          />
          <label className="sc-label mt-4" htmlFor="reason">
            사유
          </label>
          <textarea
            id="reason"
            className="sc-input min-h-[80px]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="발주자 요청 / 현장 여건 등"
          />
          <label className="sc-label mt-4" htmlFor="days">
            공기 연장 (일)
          </label>
          <input id="days" className="sc-input" value={daysExtend} onChange={(e) => setDaysExtend(e.target.value)} />
          <label className="sc-label mt-4" htmlFor="photo">
            사진·현장 메모
          </label>
          <input
            id="photo"
            className="sc-input"
            value={photoNote}
            onChange={(e) => setPhotoNote(e.target.value)}
            placeholder="예: 철거 전 사진 카톡 보관"
          />
        </div>

        <div className="sc-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">품목</h2>
            <button type="button" className="text-xs font-semibold text-steel-700" onClick={addLine}>
              + 줄 추가
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="grid gap-2 sm:grid-cols-[1.4fr_0.5fr_0.5fr_1fr]">
                <input
                  className="sc-input"
                  placeholder="품명"
                  value={item.name}
                  onChange={(e) =>
                    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                  }
                />
                <input
                  className="sc-input"
                  placeholder="수량"
                  value={item.qty}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) || 0 } : x)),
                    )
                  }
                />
                <input
                  className="sc-input"
                  placeholder="단위"
                  value={item.unit}
                  onChange={(e) =>
                    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)))
                  }
                />
                <input
                  className="sc-input"
                  placeholder="단가"
                  value={item.unitPrice || ""}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, unitPrice: Number(e.target.value) || 0 } : x)),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-right font-display text-xl text-ink">합계 {formatWon(draftTotal)}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" className="sc-btn-primary flex-1" onClick={() => save(true)}>
            만들고 링크 받기
          </button>
          <button type="button" className="sc-btn-secondary" onClick={() => save(false)}>
            임시 저장
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
