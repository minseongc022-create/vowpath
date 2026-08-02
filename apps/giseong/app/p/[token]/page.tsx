"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";
import { findByToken, loadState, saveState, withActivity } from "@/lib/store";
import {
  claimAmount,
  formatWon,
  lineTotal,
  netPayable,
  type PayApp,
  type Project,
} from "@/lib/types";

export default function ApproverPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const [app, setApp] = useState<PayApp | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [company, setCompany] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [reviseNote, setReviseNote] = useState("");

  useEffect(() => {
    const hit = findByToken(token);
    if (!hit) {
      setApp(null);
      return;
    }
    setApp(hit.app);
    setProject(hit.project);
    setCompany(hit.state.profile.companyName);
    if (hit.app.status === "승인") setDone("이미 승인되었습니다.");
    if (hit.app.status === "거절") setDone("이미 거절되었습니다.");
    if (hit.app.status === "수정요청") setDone("수정 요청이 전달되었습니다.");
  }, [token]);

  function decide(kind: "승인" | "거절" | "수정요청") {
    if (!app) return;
    if (kind === "수정요청" && !reviseNote.trim()) {
      setDone("수정 요청 사유를 적어 주세요.");
      return;
    }
    const state = loadState();
    const patch = {
      ...app,
      status: kind,
      decidedAt: new Date().toISOString(),
      approverNote: kind === "수정요청" ? reviseNote.trim() : app.approverNote,
    };
    let apps = state.apps.map((o) => (o.token !== token && o.id !== app.id ? o : { ...o, ...patch }));
    if (!state.apps.some((o) => o.token === token || o.id === app.id)) {
      apps = [patch, ...state.apps];
    }
    const next = withActivity(
      { ...state, apps },
      `${project?.name || "현장"} 기성#${app.number} ${kind}`,
    );
    saveState(next);
    setApp(patch);
    setDone(
      kind === "승인"
        ? "승인했습니다. 감사합니다."
        : kind === "거절"
          ? "거절했습니다. 시공사에 연락해 주세요."
          : "수정 요청을 보냈습니다.",
    );
  }

  if (!app || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh-hero px-4">
        <div className="sc-card max-w-md p-6 text-center">
          <p className="font-display text-xl text-ink">링크를 확인할 수 없습니다</p>
          <p className="mt-2 text-sm text-ink-muted">만료되었거나 잘못된 주소입니다.</p>
        </div>
      </div>
    );
  }

  const claim = claimAmount(app);
  const net = netPayable(app);
  const toDate = app.previousBilledWon + claim;

  return (
    <div className="min-h-screen bg-mesh-hero">
      <header className="border-b border-paper-line bg-paper-card/90">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <p className="font-display text-lg text-ink">{SITE.name}</p>
          <p className="text-xs text-ink-muted">기성청구 승인</p>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-xs font-semibold tracking-wide text-steel-700">{company}</p>
        <h1 className="mt-2 font-display text-2xl text-ink">
          {project.name} · 기성 #{app.number}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {app.title} · {app.period}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{app.note}</p>
        {app.photoNote ? (
          <p className="mt-2 rounded-xl bg-signal-soft px-3 py-2 text-xs text-signal-ink">검수: {app.photoNote}</p>
        ) : null}

        <div className="mt-6 sc-card p-4">
          <p className="text-sm font-semibold text-ink">금액</p>
          <dl className="mt-3 space-y-2 text-sm text-ink-muted">
            <div className="flex justify-between gap-3">
              <dt>계약</dt>
              <dd className="font-medium text-ink">{formatWon(project.contractWon)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>기청구</dt>
              <dd className="font-medium text-ink">{formatWon(app.previousBilledWon)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>이번 청구</dt>
              <dd className="font-medium text-ink">{formatWon(claim)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>청구 후 누계</dt>
              <dd className="font-medium text-ink">{formatWon(toDate)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>유보금</dt>
              <dd className="font-medium text-ink">{formatWon(app.retainageWon)}</dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-paper-line pt-3 text-right font-display text-xl text-ink">
            실지급 요청 {formatWon(net)}
          </p>
        </div>

        {app.items.length > 0 ? (
          <div className="mt-4 sc-card p-4">
            <p className="text-sm font-semibold text-ink">품목</p>
            <ul className="mt-3 space-y-2 text-sm">
              {app.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 text-ink-muted">
                  <span>
                    {i.name} · {i.qty}
                    {i.unit}
                  </span>
                  <span className="shrink-0 font-medium text-ink">{formatWon(lineTotal(i))}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {done && app.status !== "보냄" && app.status !== "작성중" ? (
          <p className="mt-8 rounded-2xl border border-steel-100 bg-steel-50 px-4 py-6 text-center text-sm font-medium text-steel-800">
            {done}
          </p>
        ) : (
          <div className="mt-8 space-y-3">
            <button type="button" className="sc-btn-primary w-full py-4" onClick={() => decide("승인")}>
              위 금액으로 승인합니다
            </button>
            <div className="sc-card p-4">
              <label className="sc-label" htmlFor="revise">
                수정 요청 사유
              </label>
              <textarea
                id="revise"
                className="sc-input min-h-[72px]"
                value={reviseNote}
                onChange={(e) => setReviseNote(e.target.value)}
                placeholder="예: 수량 재확인 필요"
              />
              <button type="button" className="sc-btn-secondary mt-3 w-full" onClick={() => decide("수정요청")}>
                수정 요청
              </button>
            </div>
            <button type="button" className="sc-btn-ghost w-full py-3" onClick={() => decide("거절")}>
              거절합니다
            </button>
            {done ? <p className="text-center text-xs text-rose-ink">{done}</p> : null}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-ink-muted">
          이 페이지는 {company}의 기성청구 합의용입니다. {SITE.name}
        </p>
      </main>
    </div>
  );
}
