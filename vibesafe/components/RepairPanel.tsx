"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TECHNICAL_DETAIL_TOGGLE_LABEL, type UiMode } from "../lib/ui-mode";
import { REPAIR_STEP_TITLES } from "../lib/repair/pipeline";
import { applyButtonLabel, highRiskWarning } from "../lib/repair/present";
import type { RepairView } from "../lib/repair/view";
import { DiffView } from "./DiffView";

/**
 * 장애 하나를 끝까지 데려가는 화면.
 *
 *   [고쳐주세요] → 원인 분석 → 수정 만들기 → 미리 확인 → [수정 적용하기] → 실서비스 확인
 *
 * ★ 버튼이 두 개뿐인 이유
 *
 * 사용자가 내려야 하는 결정은 둘이다: "고쳐볼까?"와 "이대로 적용할까?".
 * 나머지(진단할까, PR을 열까, 검증할까)는 결정이 아니라 절차다. 절차를
 * 버튼으로 만들면 사용자는 매 단계 무엇을 눌러야 할지 고민하게 되고,
 * 고민하다 결국 아무것도 안 누른다.
 *
 * ★ PR은 UX가 아니다
 *
 * 간편 모드에서는 "PR", "브랜치", "머지"라는 말이 화면에 나오지 않는다.
 * 사라진 게 아니라 [기술 상세 보기] 안에 있다. 저 말들을 모르는 사람에게
 * 그건 이해해야 할 개념이 아니라 넘어야 할 장벽이다.
 *
 * ★ 그래도 절대 하지 않는 것
 *
 * 검증을 통과하지 못한 제안에 적용 버튼을 보여주지 않는다. 그 판단은 화면이
 * 아니라 서버(repair/pipeline.ts의 canApply)가 한다 — 화면이 늘어나도
 * 판단은 한 곳에만 있어야 한다.
 */

const POLL_MS = 6000;

function StepBar({ index, total }: { index: number; total: number }) {
  if (index <= 0) return null;
  return (
    <div className="vs-row" style={{ gap: 6, flexWrap: "wrap" }}>
      {REPAIR_STEP_TITLES.slice(0, total).map((title, i) => (
        <span
          key={title}
          className="vs-badge"
          data-tone={i + 1 < index ? "ok" : i + 1 === index ? "warn" : "neutral"}
        >
          {i + 1 === index ? `${title} (진행 중)` : title}
        </span>
      ))}
    </div>
  );
}

function CheckLine({ ok, text }: { ok: boolean | null; text: string }) {
  return (
    <div className="vs-row" style={{ gap: 8, alignItems: "flex-start" }}>
      <span aria-hidden style={{ lineHeight: 1.5 }}>
        {ok === true ? "✅" : ok === false ? "❌" : "➖"}
      </span>
      <span style={{ fontSize: 14 }}>{text}</span>
    </div>
  );
}

export function RepairPanel({
  projectId,
  incidentId,
  initialView,
}: {
  projectId: string;
  incidentId: string;
  initialView: RepairView;
}) {
  const [view, setView] = useState<RepairView>(initialView);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(initialView.mode === "expert");
  const [confirmHighRisk, setConfirmHighRisk] = useState(false);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [previewInput, setPreviewInput] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mode: UiMode = view.mode;
  const proposal = view.current;

  const refresh = useCallback(async () => {
    const res = await fetch(
      `/api/vibesafe/projects/${projectId}/incidents/${incidentId}/repair`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { view?: RepairView };
    if (data.view) setView(data.view);
  }, [projectId, incidentId]);

  // 검증과 배포는 우리가 기다리는 게 아니라 밖에서 끝난다(프리뷰 배포, 워커,
  // 실서비스 배포). 그동안 화면이 멈춰 있으면 사용자는 실패했다고 생각한다.
  const moving =
    proposal != null &&
    ["draft", "opened", "verifying", "applying", "applied"].includes(proposal.status);

  useEffect(() => {
    if (!moving) return;
    timer.current = setTimeout(() => void refresh(), POLL_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [moving, refresh, view]);

  async function call(key: string, url: string, body?: unknown): Promise<boolean> {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string } & Record<string, unknown>;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "요청에 실패했습니다.");
        return false;
      }
      return true;
    } catch {
      setError("연결에 실패했습니다.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  /**
   * [고쳐주세요] — 사용자가 누르는 첫 번째이자, 대부분의 경우 유일한 버튼.
   *
   * 안에서는 진단 → 수정 생성 → 브랜치·PR까지 이어서 한다. 사용자에게
   * 세 번 물어보지 않는다. 어차피 세 단계 모두 **아무것도 바꾸지 않는**
   * 읽기와 제안이기 때문이다. 실제 서비스를 바꾸는 건 다음 버튼이다.
   */
  async function requestFix() {
    setBusy("fix");
    setError(null);
    try {
      const diagRes = await fetch(`/api/vibesafe/projects/${projectId}/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId }),
      });
      const diagData = (await diagRes.json()) as {
        ok?: boolean;
        error?: string;
        diagnosis?: { diagnosisId: string };
      };
      if (!diagRes.ok || !diagData.ok || !diagData.diagnosis) {
        setError(diagData.error ?? "원인을 찾지 못했습니다.");
        return;
      }

      if (!view.permissions.proposePr) {
        await refresh();
        setNotice(
          "원인은 찾았습니다. 고친 코드까지 만들려면 '수정안 PR로 올리기' 권한을 켜주세요.",
        );
        return;
      }

      const fixRes = await fetch(`/api/vibesafe/projects/${projectId}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosisId: diagData.diagnosis.diagnosisId }),
      });
      const fixData = (await fixRes.json()) as { ok?: boolean; error?: string };
      if (!fixRes.ok || !fixData.ok) {
        setError(fixData.error ?? "수정안을 만들지 못했습니다.");
        await refresh();
        return;
      }
      await refresh();
    } catch {
      setError("연결에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  /** [수정 적용하기] — 실제 서비스를 바꾸는 유일한 버튼. */
  async function applyNow() {
    if (!proposal) return;
    const done = await call("apply", `/api/vibesafe/projects/${projectId}/apply`, {
      proposalId: proposal.id,
    });
    if (done) {
      setNotice("적용했습니다. 배포가 끝나면 실제 서비스에서 다시 확인하겠습니다.");
      await refresh();
    }
  }

  /**
   * 미리보기 배포 신호(webhook)가 안 왔을 때 직접 주소를 넣어 검증을 건다.
   * Vercel이 아닌 곳에 배포하거나, 연동이 안 걸려 있으면 이 경로가 필요하다.
   */
  async function submitPreviewUrl() {
    if (!proposal || !previewInput.trim()) return;
    const done = await call("preview-verify", `/api/vibesafe/projects/${projectId}/repair-verify`, {
      proposalId: proposal.id,
      previewUrl: previewInput.trim(),
    });
    if (done) {
      setPreviewInput("");
      setNotice("입력하신 주소에서 확인을 시작했습니다.");
      await refresh();
    }
  }

  async function markVerdict(value: "real" | "false_alarm") {
    const done = await call("verdict", `/api/vibesafe/projects/${projectId}/verdict`, {
      incidentId,
      verdict: value,
    });
    if (done) setVerdict(value);
  }

  const highRisk = proposal?.risk.level === "high";
  const applyBlocked = highRisk && !confirmHighRisk;

  return (
    <div className="vs-stack">
      {error && (
        <div className="vs-alert" data-tone="error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="vs-alert" data-tone="info" role="status">
          {notice}
        </div>
      )}

      {/* ── 아직 아무 시도도 없을 때: [고쳐주세요] ── */}
      {!proposal && (
        <div className="vs-card vs-stack">
          <h3 className="vs-section-title">
            {mode === "simple" ? "고쳐드릴까요?" : "원인 분석하고 수정안 만들기"}
          </h3>
          {view.permissions.diagnose ? (
            <>
              <p className="vs-hint">
                {mode === "simple"
                  ? "마지막으로 정상이었던 시점 이후 무엇이 바뀌었는지 찾아보고, 고칠 수 있으면 수정안을 만들어 미리 확인까지 해드립니다. 이 과정에서 회원님의 서비스는 아무것도 바뀌지 않습니다."
                  : "baseline 커밋부터 실패 커밋까지의 변경을 읽어 원인 후보를 찾고, 수정 패치를 만들어 브랜치와 PR로 올린 뒤 프리뷰 배포에서 핵심 흐름을 다시 돌립니다."}
              </p>
              <div>
                <button
                  className="vs-btn vs-btn-primary vs-btn-lg"
                  onClick={() => void requestFix()}
                  disabled={busy !== null}
                >
                  {busy === "fix" ? "찾아보는 중…" : "고쳐주세요"}
                </button>
              </div>
            </>
          ) : (
            <p className="vs-hint">
              <strong>원인 분석</strong> 권한을 켜면, 마지막 정상 시점 이후 무엇이
              바뀌었는지 읽어 범인을 좁혀드립니다. 저장소를 읽기만 하고 아무것도 바꾸지 않습니다.
            </p>
          )}
        </div>
      )}

      {/* ── 진행 중이거나 끝난 수정 ── */}
      {proposal && (
        <div className="vs-card vs-stack">
          <StepBar index={proposal.progress.index} total={proposal.progress.total} />

          <div>
            <div className="vs-row" style={{ gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span className="vs-badge" data-tone={proposal.risk.tone}>
                {proposal.risk.label}
              </span>
              {proposal.attempt > 1 && (
                <span className="vs-badge" data-tone="neutral">
                  {proposal.attempt}번째 시도
                </span>
              )}
              {mode === "expert" && (
                <span className="vs-badge" data-tone="neutral">
                  {proposal.status}
                </span>
              )}
            </div>
            <h3 className="vs-section-title" style={{ marginBottom: 4 }}>
              {proposal.headline}
            </h3>
            <p style={{ fontSize: 14.5, margin: "8px 0 0" }}>{proposal.rationale}</p>
          </div>

          {/* 검증 결과 — 확인하기 전에는 보여주지 않는다 */}
          {proposal.verify.checked && (
            <div className="vs-surface-sunken vs-stack-sm" style={{ padding: 12, borderRadius: 8 }}>
              <strong style={{ fontSize: 14 }}>
                {mode === "simple" ? "미리 확인해본 결과" : "프리뷰 검증 결과"}
              </strong>
              {proposal.verify.sentences.map((line) => (
                <CheckLine key={line.text} ok={line.ok} text={line.text} />
              ))}
            </div>
          )}

          {/* 무엇이 바뀌는가 */}
          {proposal.changes.length > 0 && (
            <div className="vs-stack-sm">
              <strong style={{ fontSize: 14 }}>바뀌는 내용</strong>
              {proposal.changes.map((change) => (
                <div key={change.path}>
                  <p className="vs-hint" style={{ margin: "0 0 4px" }}>
                    {mode === "simple" ? change.whatChanged : `${change.path} — ${change.whatChanged}`}
                  </p>
                  {(mode === "expert" || showTechnical) && change.diff && (
                    <DiffView diff={change.diff} />
                  )}
                </div>
              ))}
            </div>
          )}

          {proposal.error && (
            <div className="vs-alert" data-tone="warn">
              {proposal.error}
            </div>
          )}

          {/* HIGH 위험 — 버튼을 없애지는 않지만, 모르고 누르게 두지도 않는다 */}
          {highRisk && proposal.apply.allowed && (
            <div className="vs-alert" data-tone="warn">
              <strong>한 번 더 확인해주세요</strong>
              <p style={{ margin: "6px 0 10px" }}>{highRiskWarning(proposal.risk.reason)}</p>
              <label className="vs-row" style={{ gap: 8 }}>
                <input
                  type="checkbox"
                  checked={confirmHighRisk}
                  onChange={(e) => setConfirmHighRisk(e.target.checked)}
                />
                <span style={{ fontSize: 14 }}>바뀌는 내용을 확인했습니다.</span>
              </label>
            </div>
          )}

          {/* 적용 버튼 — 서버가 허락했을 때만 보인다 */}
          {proposal.apply.allowed ? (
            <div>
              <button
                className="vs-btn vs-btn-primary vs-btn-lg"
                onClick={() => void applyNow()}
                disabled={busy !== null || applyBlocked}
              >
                {busy === "apply" ? "적용하는 중…" : applyButtonLabel(proposal.status, mode)}
              </button>
              <p className="vs-hint" style={{ marginTop: 8 }}>
                {mode === "simple"
                  ? "누르면 이 수정이 실제 서비스에 반영됩니다. 반영된 뒤 실제로 되는지 다시 확인해서 알려드립니다."
                  : `PR #${proposal.technical.prNumber ?? "?"}을 squash로 머지한 뒤, 운영 배포가 끝나면 핵심 흐름을 다시 돌립니다.`}
              </p>
            </div>
          ) : (
            proposal.apply.reason && (
              <p className="vs-hint">{proposal.apply.reason}</p>
            )
          )}

          {/* 미리보기 신호가 안 왔을 때 직접 주소를 넣는다 */}
          {!proposal.technical.previewUrl &&
            proposal.technical.prNumber != null &&
            ["opened", "needs_human"].includes(proposal.status) && (
              <div className="vs-surface-sunken vs-stack-sm" style={{ padding: 12, borderRadius: 8 }}>
                <strong style={{ fontSize: 14 }}>
                  {mode === "simple" ? "미리 확인할 주소를 아시나요?" : "미리보기 URL 직접 입력"}
                </strong>
                <p className="vs-hint" style={{ margin: 0 }}>
                  {mode === "simple"
                    ? "보통은 자동으로 찾아서 확인합니다. 시간이 좀 지났는데 안 됐다면, 미리보기 화면 주소를 직접 넣어 지금 확인할 수 있습니다."
                    : "deployment_status 웹훅을 받지 못했습니다(Vercel이 아니거나 연동이 안 걸려 있을 수 있습니다). 프리뷰 배포 주소를 직접 넣으면 바로 검증을 시작합니다."}
                </p>
                <div className="vs-row" style={{ gap: 8 }}>
                  <input
                    type="url"
                    className="vs-input vs-input-sm"
                    placeholder="https://your-app-git-fix-xxxx.vercel.app"
                    value={previewInput}
                    onChange={(e) => setPreviewInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="vs-btn vs-btn-sm"
                    onClick={() => void submitPreviewUrl()}
                    disabled={busy !== null || !previewInput.trim()}
                  >
                    {busy === "preview-verify" ? "시작하는 중…" : "이 주소로 확인하기"}
                  </button>
                </div>
              </div>
            )}

          {/* 다시 시도 — 실패한 수정에서 빠져나갈 길을 준다 */}
          {["needs_human", "failed"].includes(proposal.status) && view.permissions.proposePr && (
            <div>
              <button
                className="vs-btn"
                onClick={() => void requestFix()}
                disabled={busy !== null}
              >
                {busy === "fix" ? "다시 찾아보는 중…" : "다른 방법으로 다시 시도"}
              </button>
            </div>
          )}

          {/* 기술 상세 — 간편 모드에서도 지우지 않는다. 접어둘 뿐이다 */}
          {mode === "simple" && (
            <div>
              <button
                type="button"
                className="vs-btn vs-btn-sm vs-btn-ghost"
                onClick={() => setShowTechnical((value) => !value)}
                aria-expanded={showTechnical}
              >
                {showTechnical ? "기술 상세 접기" : TECHNICAL_DETAIL_TOGGLE_LABEL}
              </button>
            </div>
          )}

          {(mode === "expert" || showTechnical) && (
            <div className="vs-surface-sunken vs-stack-sm" style={{ padding: 12, borderRadius: 8 }}>
              {proposal.technical.prUrl && (
                <div className="vs-row-between">
                  <span className="vs-hint">Pull Request</span>
                  <a
                    className="vs-btn vs-btn-sm"
                    href={proposal.technical.prUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    #{proposal.technical.prNumber} 열기
                  </a>
                </div>
              )}
              {proposal.technical.branchName && (
                <p className="vs-hint vs-mono">브랜치: {proposal.technical.branchName}</p>
              )}
              {proposal.technical.previewUrl && (
                <p className="vs-hint vs-mono">미리보기: {proposal.technical.previewUrl}</p>
              )}
              {proposal.technical.mergedSha && (
                <p className="vs-hint vs-mono">머지 커밋: {proposal.technical.mergedSha.slice(0, 10)}</p>
              )}
              {proposal.technical.confidence != null && (
                <p className="vs-hint">
                  원인 확신도: {Math.round(proposal.technical.confidence * 100)}%
                </p>
              )}
              {proposal.risk.reason && <p className="vs-hint">위험도 판정: {proposal.risk.reason}</p>}
              {proposal.appliedBy && (
                <p className="vs-hint">
                  적용: {proposal.appliedBy === "auto" ? "자동(LOW 위험)" : proposal.appliedBy}
                </p>
              )}
              {proposal.verify.flows.length > 0 && (
                <div>
                  <p className="vs-hint" style={{ marginBottom: 4 }}>흐름별 검증 결과</p>
                  {proposal.verify.flows.map((flow) => (
                    <p key={flow.flowKey} className="vs-hint vs-mono">
                      {flow.ok ? "PASS" : "FAIL"} · {flow.flowKey} — {flow.note}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 지나간 시도들 — 실패도 이력이다. 숨기면 신뢰가 아니라 의심을 만든다 */}
      {view.past.length > 0 && (
        <details className="vs-card vs-details">
          <summary>지난 수정 시도 {view.past.length}건</summary>
          <div className="vs-stack-sm" style={{ marginTop: 10 }}>
            {view.past.map((item) => (
              <div key={item.id} className="vs-row-between">
                <span style={{ fontSize: 14 }}>{item.title}</span>
                <span className="vs-badge" data-tone="neutral">{item.stage}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 되돌리기 — 원인을 찾기 전에 서비스를 먼저 살려야 할 때 */}
      {view.permissions.rollback && view.incident.status === "open" && (
        <div className="vs-card vs-stack">
          <h3 className="vs-section-title">지금 바로 되돌리기</h3>
          <p className="vs-hint">
            원인을 찾기 전에 서비스를 먼저 살려야 한다면, 직전 정상 배포로 되돌립니다.
          </p>
          <div>
            <button
              className="vs-btn vs-btn-danger"
              onClick={() =>
                void call("rollback", `/api/vibesafe/projects/${projectId}/rollback`, { incidentId })
              }
              disabled={busy !== null}
            >
              {busy === "rollback" ? "되돌리는 중…" : "이전 배포로 되돌리기"}
            </button>
          </div>
        </div>
      )}

      {/* 오탐 신고 — 이 숫자가 신뢰 점수의 원천이다 */}
      <div className="vs-card vs-stack-sm">
        <strong style={{ fontSize: 14 }}>이 알림이 정확했나요?</strong>
        {verdict ? (
          <p className="vs-hint">
            {verdict === "real" ? "알려주셔서 감사합니다." : "오탐으로 기록했습니다. 흐름을 다듬는 데 쓰겠습니다."}
          </p>
        ) : (
          <div className="vs-row" style={{ gap: 8 }}>
            <button className="vs-btn vs-btn-sm" onClick={() => void markVerdict("real")} disabled={busy !== null}>
              실제 문제였습니다
            </button>
            <button
              className="vs-btn vs-btn-sm"
              onClick={() => void markVerdict("false_alarm")}
              disabled={busy !== null}
            >
              잘못된 알림이었습니다
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
