"use client";

import { useState } from "react";

type Suspect = {
  sha: string;
  message: string;
  author: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  files: string[];
};

type Diagnosis = {
  diagnosisId: string;
  summary: string;
  suspects: Suspect[];
  suggestion: string | null;
  commitsScanned: number;
};

type Proposal = {
  proposalId: string;
  status: string;
  title: string;
  explanation: string;
  prUrl: string | null;
  changedFiles: string[];
  suggestsFlowUpdate: boolean;
};

const CONFIDENCE_LABEL = { high: "가능성 높음", medium: "가능성 있음", low: "가능성 낮음" } as const;

/**
 * 장애 하나에 대한 진단 → 수정 → 되돌리기 흐름.
 *
 * ★ 각 버튼은 권한이 없으면 아예 안 보인다
 *
 * 눌렀는데 "권한이 없습니다"가 뜨는 것만큼 안 좋은 경험이 없다. 권한이
 * 없으면 버튼 대신 "이걸 켜면 뭘 할 수 있는지"를 보여준다.
 */
export function RepairPanel({
  projectId,
  incidentId,
  flowTitle,
  permissions,
}: {
  projectId: string;
  incidentId: string;
  flowTitle: string;
  permissions: { diagnose: boolean; proposePr: boolean; rollback: boolean };
}) {
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);

  async function call<T>(key: string, url: string, body?: unknown): Promise<T | null> {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string } & Record<string, unknown>;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "요청에 실패했습니다.");
        return null;
      }
      return data as T;
    } catch {
      setError("연결에 실패했습니다.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function runDiagnose() {
    const result = await call<{ diagnosis: Diagnosis }>(
      "diagnose",
      `/api/vibesafe/projects/${projectId}/diagnose`,
      { incidentId },
    );
    if (result) setDiagnosis(result.diagnosis);
  }

  async function runFix() {
    if (!diagnosis) return;
    const result = await call<{ proposal: Proposal }>(
      "fix",
      `/api/vibesafe/projects/${projectId}/fix`,
      { diagnosisId: diagnosis.diagnosisId },
    );
    if (result) setProposal(result.proposal);
  }

  async function runRollback() {
    const result = await call<{ rollback: { toUrl: string } }>(
      "rollback",
      `/api/vibesafe/projects/${projectId}/rollback`,
      { incidentId },
    );
    if (result) setError(null);
  }

  async function markVerdict(value: "real" | "false_alarm") {
    const result = await call("verdict", `/api/vibesafe/projects/${projectId}/verdict`, {
      incidentId,
      verdict: value,
    });
    if (result) setVerdict(value);
  }

  return (
    <div className="vs-stack">
      {error && (
        <div className="vs-alert" data-tone="error" role="alert">
          {error}
        </div>
      )}

      {/* 1단계 — 진단 */}
      {!diagnosis && (
        <div className="vs-card vs-stack">
          <h3 className="vs-section-title">왜 깨졌는지 찾기</h3>
          {permissions.diagnose ? (
            <>
              <p className="vs-hint">
                마지막으로 정상이었던 시점 이후 들어온 커밋을 읽어 원인 후보를 찾습니다.
              </p>
              <div>
                <button className="vs-btn vs-btn-primary" onClick={runDiagnose} disabled={busy !== null}>
                  {busy === "diagnose" ? "분석 중…" : "원인 분석하기"}
                </button>
              </div>
            </>
          ) : (
            <p className="vs-hint">
              <strong>원인 분석</strong> 권한을 켜면, 마지막 정상 시점 이후 어떤 커밋이
              들어왔는지 읽어 범인을 좁혀줍니다. 저장소를 읽기만 하고 아무것도 바꾸지 않습니다.
            </p>
          )}
        </div>
      )}

      {/* 진단 결과 */}
      {diagnosis && (
        <div className="vs-card vs-stack">
          <div className="vs-row-between">
            <h3 className="vs-section-title">원인 분석</h3>
            <span className="vs-badge" data-tone="neutral">커밋 {diagnosis.commitsScanned}개 확인</span>
          </div>
          <p style={{ fontSize: 14.5, margin: 0 }}>{diagnosis.summary}</p>

          {diagnosis.suspects.length > 0 && (
            <div>
              {diagnosis.suspects.map((suspect) => (
                <div className="vs-suspect" key={suspect.sha} data-confidence={suspect.confidence}>
                  <div className="vs-row" style={{ gap: 8, marginBottom: 4 }}>
                    <span className="vs-sha">{suspect.sha.slice(0, 8)}</span>
                    <span className="vs-badge" data-tone={
                      suspect.confidence === "high" ? "down" : suspect.confidence === "medium" ? "warn" : "neutral"
                    }>
                      {CONFIDENCE_LABEL[suspect.confidence]}
                    </span>
                    <span className="vs-hint">{suspect.author}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{suspect.message}</div>
                  <p className="vs-hint" style={{ marginTop: 4 }}>{suspect.reason}</p>
                  {suspect.files.length > 0 && (
                    <p className="vs-hint vs-mono" style={{ marginTop: 4 }}>
                      {suspect.files.slice(0, 4).join(", ")}
                      {suspect.files.length > 4 && ` 외 ${suspect.files.length - 4}개`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {diagnosis.suggestion && (
            <div className="vs-alert" data-tone="info">
              <strong>고칠 방향</strong>
              <p style={{ margin: "6px 0 0" }}>{diagnosis.suggestion}</p>
            </div>
          )}

          {/* 2단계 — 수정 PR */}
          {!proposal && (
            permissions.proposePr ? (
              <div>
                <button className="vs-btn vs-btn-primary" onClick={runFix} disabled={busy !== null}>
                  {busy === "fix" ? "수정안 만드는 중…" : "수정안 PR로 올리기"}
                </button>
                <p className="vs-hint" style={{ marginTop: 8 }}>
                  새 브랜치에 올리고 PR을 엽니다. <strong>머지는 직접 하셔야 합니다.</strong>
                </p>
              </div>
            ) : (
              <p className="vs-hint">
                <strong>수정안 PR</strong> 권한을 켜면 고친 코드를 PR로 올려줍니다.
                기본 브랜치에 직접 커밋하지는 않습니다.
              </p>
            )
          )}
        </div>
      )}

      {/* 수정 결과 */}
      {proposal && (
        <div className="vs-card vs-stack">
          <h3 className="vs-section-title">{proposal.title}</h3>
          <p style={{ fontSize: 14.5, margin: 0 }}>{proposal.explanation}</p>

          {proposal.suggestsFlowUpdate && (
            <div className="vs-alert" data-tone="warn">
              앱 코드가 아니라 <strong>검사 흐름 정의</strong>를 고쳐야 한다고 판단했습니다.
              앱이 의도적으로 바뀐 것으로 보입니다 — 흐름 수정 화면에서 선택자를 새 화면에 맞춰주세요.
            </div>
          )}

          {proposal.prUrl ? (
            <>
              <div className="vs-row">
                <a className="vs-btn vs-btn-primary" href={proposal.prUrl} target="_blank" rel="noreferrer noopener">
                  PR 확인하고 머지하기
                </a>
              </div>
              <p className="vs-hint">
                바꾼 파일: {proposal.changedFiles.join(", ")}
              </p>
            </>
          ) : (
            !proposal.suggestsFlowUpdate && (
              <p className="vs-hint">
                안전하게 고칠 방법을 찾지 못해 PR을 만들지 않았습니다. 틀린 수정보다 안 하는 게 낫습니다.
              </p>
            )
          )}
        </div>
      )}

      {/* 3단계 — 되돌리기 */}
      {permissions.rollback && (
        <div className="vs-card vs-stack">
          <h3 className="vs-section-title">지금 바로 되돌리기</h3>
          <p className="vs-hint">
            원인을 찾기 전에 서비스를 먼저 살려야 한다면, 직전 정상 배포로 되돌립니다.
          </p>
          <div>
            <button className="vs-btn vs-btn-danger" onClick={runRollback} disabled={busy !== null}>
              {busy === "rollback" ? "되돌리는 중…" : "이전 배포로 되돌리기"}
            </button>
          </div>
        </div>
      )}

      {/* 판정 — 신뢰 점수의 원천 */}
      <div className="vs-card">
        <h3 className="vs-section-title">이 알림, 맞았나요?</h3>
        <p className="vs-hint" style={{ margin: "6px 0 12px" }}>
          알려주시면 알림 정확도가 기록되고, 오탐이 잦으면 저희가 흐름을 고칩니다.
        </p>
        {verdict ? (
          <span className="vs-badge" data-tone={verdict === "real" ? "down" : "neutral"}>
            {verdict === "real" ? "진짜 문제로 표시됨" : "오탐으로 표시됨"}
          </span>
        ) : (
          <div className="vs-row">
            <button className="vs-btn vs-btn-sm" onClick={() => markVerdict("real")} disabled={busy !== null}>
              진짜 문제였습니다
            </button>
            <button className="vs-btn vs-btn-sm" onClick={() => markVerdict("false_alarm")} disabled={busy !== null}>
              오탐이었습니다 ({flowTitle}는 정상)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
