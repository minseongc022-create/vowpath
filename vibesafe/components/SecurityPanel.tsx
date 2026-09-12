"use client";

import { useCallback, useEffect, useState } from "react";
import { relativeTime } from "../lib/format";

type Probe = {
  id: string;
  probe: string;
  severity: string;
  title: string;
  status: string;
  target: string;
  evidence: string;
  advice: string;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "긴급", high: "높음", medium: "보통", low: "낮음",
};
const SEVERITY_TONE: Record<string, string> = {
  critical: "down", high: "down", medium: "warn", low: "neutral",
};

/**
 * 보안 점검 화면.
 *
 * ★ 긴급 항목은 "지금 뭘 해야 하는지"를 먼저 쓴다
 *
 * .env가 열려 있는 걸 발견했을 때 사용자에게 필요한 건 취약점 설명이 아니라
 * "지금 즉시 키를 재발급하세요"다. 설명은 그 다음이다.
 */
export function SecurityPanel({ projectId }: { projectId: string }) {
  const [probes, setProbes] = useState<Probe[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/vibesafe/projects/${projectId}/security`);
    if (!res.ok) return;
    const data = (await res.json()) as { probes?: Probe[] };
    setProbes(data.probes ?? []);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function scan() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/vibesafe/projects/${projectId}/security`, { method: "POST" });
    const data = (await res.json()) as {
      ok?: boolean; error?: string; result?: { found: number; fixed: number; critical: number };
    };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setMessage(data.error ?? "점검에 실패했습니다.");
      return;
    }
    setMessage(
      data.result?.found === 0
        ? "점검 완료 — 눈에 띄는 문제가 없습니다."
        : `점검 완료 — ${data.result?.found}건 발견${data.result?.fixed ? `, ${data.result.fixed}건 고쳐짐` : ""}`,
    );
    await load();
  }

  const open = (probes ?? []).filter((p) => p.status === "open");
  const fixed = (probes ?? []).filter((p) => p.status === "fixed");
  const critical = open.filter((p) => p.severity === "critical");

  return (
    <div className="vs-stack">
      {message && <div className="vs-alert" data-tone="info">{message}</div>}

      {critical.length > 0 && (
        <div className="vs-alert" data-tone="error">
          <strong>지금 바로 조치가 필요한 항목이 {critical.length}건 있습니다.</strong>
          <p style={{ margin: "6px 0 0" }}>
            아래 &ldquo;긴급&rdquo; 항목은 지금 이 순간 누구나 볼 수 있는 상태입니다.
          </p>
        </div>
      )}

      <div className="vs-card vs-card-flush">
        <div className="vs-card-head">
          <div>
            <h2 className="vs-section-title">공격 표면 점검</h2>
            <p className="vs-hint" style={{ marginTop: 4 }}>
              공격자가 제일 먼저 확인하는 것들을 먼저 확인합니다. 데이터를 바꾸지 않는 점검만 합니다.
            </p>
          </div>
          <button className="vs-btn vs-btn-primary vs-btn-sm" onClick={scan} disabled={busy}>
            {busy ? "점검 중…" : "지금 점검"}
          </button>
        </div>

        {probes === null ? (
          <div className="vs-empty"><p className="vs-hint">불러오는 중…</p></div>
        ) : open.length === 0 ? (
          <div className="vs-empty">
            <p className="vs-empty-title">눈에 띄는 문제가 없습니다</p>
            <p className="vs-hint">
              전문 보안 감사를 대신하지는 않습니다. 자주 나는 실수를 확인할 뿐입니다.
            </p>
          </div>
        ) : (
          <ul className="vs-flow-list">
            {open.map((probe) => (
              <li className="vs-flow-item" key={probe.id} style={{ alignItems: "flex-start" }}>
                <span className="vs-badge" data-tone={SEVERITY_TONE[probe.severity] ?? "neutral"}>
                  {SEVERITY_LABEL[probe.severity] ?? probe.severity}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="vs-flow-name">{probe.title}</div>
                  <p className="vs-flow-desc" style={{ color: "var(--vs-ink-soft)" }}>{probe.advice}</p>
                  <p className="vs-flow-desc vs-mono">
                    {probe.target} — {probe.evidence}
                  </p>
                  <p className="vs-flow-desc">{relativeTime(probe.firstSeenAt)}부터</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {fixed.length > 0 && (
          <details className="vs-details">
            <summary>고쳐진 항목 {fixed.length}건</summary>
            <ul className="vs-flow-list">
              {fixed.map((probe) => (
                <li className="vs-flow-item" key={probe.id}>
                  <span className="vs-badge" data-tone="ok">고쳐짐</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="vs-flow-name" style={{ fontWeight: 500 }}>{probe.title}</div>
                    <p className="vs-flow-desc">
                      {probe.resolvedAt ? `${relativeTime(probe.resolvedAt)} 확인` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
