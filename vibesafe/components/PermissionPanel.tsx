"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PERMISSION_LABELS, type PermissionKey } from "../lib/permission-labels";
import { relativeTime } from "../lib/format";

type PermissionState = {
  permissions: { diagnose: boolean; proposePr: boolean; rollback: boolean; rollbackDailyLimit: number };
  trust: { totalIncidents: number; confirmedReal: number; falseAlarms: number; unreviewed: number; accuracy: number | null };
  actionLog: { id: string; action: string; actor: string; summary: string; createdAt: string }[];
  canEnable: { diagnose: boolean; proposePr: boolean; rollback: boolean };
  connections: {
    githubWrite: { login: string } | null;
    vercel: { login: string } | null;
    fixAppAvailable: boolean;
  };
};

const ORDER: PermissionKey[] = ["diagnose", "proposePr", "rollback"];

/**
 * 권한 화면.
 *
 * ★ 화면이 해야 하는 일은 "설득"이 아니라 "정직한 설명"이다
 *
 * 각 단계가 무엇을 하고 무엇을 못 하는지, 켜면 뭐가 달라지는지를 그대로 쓴다.
 * 특히 "VibeSafe는 main에 직접 push하지 않습니다" 같은 **못 하는 것**을
 * 분명히 적는 게 켜게 만드는 데 더 효과적이다.
 */
export function PermissionPanel({ projectId }: { projectId: string }) {
  const [state, setState] = useState<PermissionState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/vibesafe/projects/${projectId}/permissions`);
    if (!res.ok) return;
    setState((await res.json()) as PermissionState);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(key: PermissionKey, enabled: boolean) {
    setBusy(key);
    setMessage(null);
    const res = await fetch(`/api/vibesafe/projects/${projectId}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(null);
    if (!res.ok || !data.ok) {
      setMessage({ tone: "error", text: data.error ?? "바꾸지 못했습니다." });
      return;
    }
    await load();
  }

  if (!state) return <p className="vs-hint">불러오는 중…</p>;

  const accuracy = state.trust.accuracy;

  return (
    <div className="vs-stack">
      {message && (
        <div className="vs-alert" data-tone={message.tone} role="alert">
          {message.text}
        </div>
      )}

      <div className="vs-card vs-card-flush">
        <div className="vs-card-head">
          <div>
            <h2 className="vs-section-title">VibeSafe가 할 수 있는 일</h2>
            <p className="vs-hint" style={{ marginTop: 4 }}>
              켠 것만 합니다. 언제든 끌 수 있고, 한 일은 모두 아래에 기록됩니다.
            </p>
          </div>
        </div>

        <div className="vs-perm" data-locked="false">
          <span className="vs-badge" data-tone="ok" style={{ marginTop: 2 }}>항상</span>
          <div className="vs-perm-body">
            <strong>감시</strong>
            <p className="vs-hint" style={{ marginTop: 2 }}>
              저장소를 읽고, 실제 브라우저로 핵심 기능을 확인하고, 깨지면 알려줍니다.
            </p>
          </div>
        </div>

        {ORDER.map((key) => {
          const label = PERMISSION_LABELS[key];
          const enabled = state.permissions[key];
          const canEnable = state.canEnable[key];
          return (
            <div className="vs-perm" key={key} data-locked={!canEnable && !enabled}>
              <input
                type="checkbox"
                className="vs-switch"
                checked={enabled}
                disabled={busy !== null || (!canEnable && !enabled)}
                onChange={(e) => toggle(key, e.target.checked)}
                aria-label={label.title}
              />
              <div className="vs-perm-body">
                <strong>{label.title}</strong>
                <p className="vs-hint" style={{ marginTop: 2 }}>{label.detail}</p>
                <p className="vs-hint" style={{ marginTop: 4, color: "var(--vs-ink-soft)" }}>
                  {label.risk}
                </p>
                {!canEnable && !enabled && (
                  <p className="vs-hint" style={{ marginTop: 6 }}>
                    {key === "proposePr" ? (
                      <>
                        먼저 <Link href="/vibesafe/account">수정 권한 연결</Link>이 필요합니다.
                        기본 연결은 읽기 전용이라 PR을 올릴 수 없습니다.
                      </>
                    ) : (
                      <>
                        먼저 <Link href="/vibesafe/account">Vercel 연결</Link>이 필요합니다.
                      </>
                    )}
                  </p>
                )}
                {key === "rollback" && enabled && (
                  <p className="vs-hint" style={{ marginTop: 4 }}>
                    하루 최대 {state.permissions.rollbackDailyLimit}회까지만 되돌립니다.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 신뢰 점수 — 권한을 올릴 근거가 되는 숫자 */}
      <div className="vs-card">
        <div className="vs-row-between" style={{ marginBottom: 10 }}>
          <h2 className="vs-section-title">알림 정확도</h2>
          {accuracy !== null && (
            <span className="vs-badge" data-tone={accuracy >= 0.8 ? "ok" : accuracy >= 0.5 ? "warn" : "down"}>
              {Math.round(accuracy * 100)}% 정확
            </span>
          )}
        </div>
        {state.trust.totalIncidents === 0 ? (
          <p className="vs-hint">아직 발견된 문제가 없습니다.</p>
        ) : (
          <>
            <p className="vs-hint">
              알림 {state.trust.confirmedReal + state.trust.falseAlarms}건 확인됨 — 진짜 문제{" "}
              {state.trust.confirmedReal}건, 오탐 {state.trust.falseAlarms}건
              {state.trust.unreviewed > 0 && `, 미확인 ${state.trust.unreviewed}건`}
            </p>
            <p className="vs-hint" style={{ marginTop: 6 }}>
              장애 화면에서 &ldquo;진짜 문제였다 / 오탐이었다&rdquo;를 표시해주시면 이 숫자가
              정확해집니다. 정확도가 높아야 다음 권한을 맡길 만해집니다.
            </p>
          </>
        )}
      </div>

      {/* 감사 로그 — 이게 없으면 아무도 권한을 안 준다 */}
      <div className="vs-card vs-card-flush">
        <div className="vs-card-head">
          <h2 className="vs-section-title">VibeSafe가 한 일</h2>
        </div>
        {state.actionLog.length === 0 ? (
          <div className="vs-empty">
            <p className="vs-hint">아직 기록이 없습니다.</p>
          </div>
        ) : (
          <ul className="vs-flow-list">
            {state.actionLog.map((entry) => (
              <li className="vs-flow-item" key={entry.id}>
                <span
                  className="vs-badge"
                  data-tone={
                    entry.action === "rollback" ? "warn" :
                    entry.action === "pr_opened" ? "info" :
                    entry.action.startsWith("permission") ? "neutral" : "neutral"
                  }
                >
                  {entry.action === "rollback" ? "되돌림" :
                   entry.action === "pr_opened" ? "PR" :
                   entry.action === "diagnosis" ? "분석" :
                   entry.action === "probe" ? "보안" : "권한"}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="vs-flow-name" style={{ fontWeight: 500 }}>{entry.summary}</div>
                  <p className="vs-flow-desc">
                    {relativeTime(entry.createdAt)} · {entry.actor === "system" ? "자동" : entry.actor}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
