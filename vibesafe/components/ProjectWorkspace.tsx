"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectDashboard } from "../lib/dashboard";
import { relativeTime } from "../lib/format";
import { ACTION_LABELS, type FlowAction } from "../lib/flows/steps";
import { CATEGORY_LABELS } from "../lib/format";

/**
 * 앱 상태 화면.
 *
 * ★ 기본 화면에는 로그가 없다
 *
 * 이 화면을 보는 사람은 "내 앱 괜찮아?"만 알고 싶다. 스택트레이스와 선택자는
 * 접어두고, 펼쳐야 나온다. 개발자에게도 나쁘지 않다 — 필요할 때 한 번 누르면 된다.
 */
export function ProjectWorkspace({ data }: { data: ProjectDashboard }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => router.refresh(), [router]);

  // 검사가 도는 동안에만 화면을 새로고침한다. 항상 돌리면 서버 함수 호출이
  // 그대로 비용이 된다.
  useEffect(() => {
    if (!data.activeRun) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    pollRef.current = setInterval(refresh, 6000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [data.activeRun, refresh]);

  async function call(key: string, url: string, init?: RequestInit) {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch(url, init);
      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setMessage({ tone: "error", text: payload.error ?? "요청에 실패했습니다." });
        return null;
      }
      return payload;
    } catch {
      setMessage({ tone: "error", text: "연결에 실패했습니다." });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function analyze(force = false) {
    const result = await call(
      "analyze",
      `/api/vibesafe/projects/${data.project.id}/analyze${force ? "?force=1" : ""}`,
      { method: "POST" },
    );
    if (result) {
      setMessage({ tone: "ok", text: "분석이 끝났습니다. 아래에서 핵심 흐름을 확인해주세요." });
      refresh();
    }
  }

  async function startRun() {
    const result = await call("run", `/api/vibesafe/projects/${data.project.id}/runs`, {
      method: "POST",
    });
    if (result) {
      setMessage({
        tone: "info",
        text: "검사를 큐에 넣었습니다. 워커가 집어가면 결과가 나타납니다.",
      });
      refresh();
    }
  }

  async function setFlowStatus(flowId: string, status: "active" | "disabled") {
    const result = await call(`flow-${flowId}`, `/api/vibesafe/projects/${data.project.id}/flows`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: [{ flowId, status }] }),
    });
    if (result) refresh();
  }

  async function approveAllSafe() {
    const safeFlows = data.flows.filter((f) => f.riskLevel === "safe" && f.status !== "active");
    if (safeFlows.length === 0) return;
    const result = await call("approve-all", `/api/vibesafe/projects/${data.project.id}/flows`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: safeFlows.map((f) => ({ flowId: f.flowId, status: "active" })),
      }),
    });
    if (result) {
      setMessage({ tone: "ok", text: `${safeFlows.length}개 흐름을 켰습니다.` });
      refresh();
    }
  }

  async function deleteFlow(flowId: string) {
    const result = await call(
      `del-${flowId}`,
      `/api/vibesafe/projects/${data.project.id}/flows/${flowId}`,
      { method: "DELETE" },
    );
    if (result) refresh();
  }

  const heroState = data.health === "checking" ? "unknown" : data.health;
  const needsReview = data.pendingFlowCount > 0;
  const hasFlows = data.flows.length > 0;

  return (
    <div className="vs-container">
      <div className="vs-stack">
        <div className="vs-row-between">
          <div>
            <h1 className="vs-page-title">{data.project.name}</h1>
            <p className="vs-page-sub">
              {data.project.repository
                ? `${data.project.repository.owner}/${data.project.repository.repo}`
                : "저장소 없음"}
              {data.project.productionUrl && (
                <>
                  {" · "}
                  <a href={data.project.productionUrl} target="_blank" rel="noreferrer noopener">
                    {data.project.productionUrl.replace(/^https?:\/\//, "")}
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="vs-row">
            <Link href={`/vibesafe/projects/${data.project.id}/settings`} className="vs-btn vs-btn-sm">
              설정
            </Link>
            <button
              className="vs-btn vs-btn-primary"
              onClick={startRun}
              disabled={busy !== null || data.activeFlowCount === 0 || Boolean(data.activeRun)}
            >
              {data.activeRun ? "확인 중…" : "지금 확인하기"}
            </button>
          </div>
        </div>

        {message && (
          <div className="vs-alert" data-tone={message.tone} role="status">
            {message.text}
          </div>
        )}

        {/* 상태 */}
        <div className="vs-status-hero" data-state={heroState}>
          <div className="vs-status-line">
            <span className="vs-status-dot" data-state={data.health === "checking" ? "running" : data.health} />
            <span className="vs-status-title">
              {data.health === "down" ? "🔴 문제 발견" : data.health === "ok" ? "정상" : data.headline}
            </span>
          </div>
          {data.health === "down" && data.openIncidents.length > 0 && (
            <>
              <p className="vs-status-note">
                최근 변경 이후 <strong>{data.openIncidents[0].flowTitle}</strong> 기능이 정상
                작동하지 않습니다.
                {data.openIncidents[0].failedStepDescription && (
                  <>
                    {" "}
                    실패한 단계: {data.openIncidents[0].failedStepDescription}
                  </>
                )}
              </p>
              <div className="vs-row" style={{ marginTop: 12 }}>
                <Link
                  href={`/vibesafe/projects/${data.project.id}/incidents/${data.openIncidents[0].id}`}
                  className="vs-btn vs-btn-primary vs-btn-sm"
                >
                  원인 찾고 고치기
                </Link>
                {data.openIncidents.length > 1 && (
                  <span className="vs-hint">외 {data.openIncidents.length - 1}건</span>
                )}
              </div>
            </>
          )}
          <p className="vs-status-note">
            마지막 확인: {relativeTime(data.lastRun?.finishedAt ?? null)}
            {" · "}
            {data.nextCheckHint}
          </p>
        </div>

        {/* 흐름 목록 */}
        {!hasFlows ? (
          <div className="vs-card vs-stack">
            <h2 className="vs-section-title">아직 앱을 분석하지 않았습니다</h2>
            <p className="vs-hint">
              저장소를 읽고 이 앱의 핵심 기능을 찾아냅니다. 보통 30초에서 2분 걸립니다.
            </p>
            <div>
              <button className="vs-btn vs-btn-primary" onClick={() => analyze(false)} disabled={busy !== null}>
                {busy === "analyze" ? "분석 중…" : "앱 분석하기"}
              </button>
            </div>
          </div>
        ) : (
          <div className="vs-card vs-card-flush">
            <div className="vs-card-head">
              <div>
                <h2 className="vs-section-title">핵심 기능</h2>
                {data.appModel && (
                  <p className="vs-hint" style={{ marginTop: 4 }}>
                    {data.appModel.appType} · {data.appModel.summary}
                  </p>
                )}
              </div>
              <div className="vs-row">
                {needsReview && (
                  <button className="vs-btn vs-btn-primary vs-btn-sm" onClick={approveAllSafe} disabled={busy !== null}>
                    안전한 흐름 모두 켜기
                  </button>
                )}
                <button className="vs-btn vs-btn-sm" onClick={() => analyze(true)} disabled={busy !== null}>
                  {busy === "analyze" ? "분석 중…" : "다시 분석"}
                </button>
              </div>
            </div>

            {needsReview && (
              <div style={{ padding: "12px 20px", background: "var(--vs-primary-wash)" }}>
                <p className="vs-hint" style={{ color: "var(--vs-primary-deep)" }}>
                  AI가 찾은 흐름 {data.pendingFlowCount}개가 확인을 기다리고 있습니다. 맞는
                  것만 켜주세요 — 켠 흐름만 실제로 실행됩니다.
                </p>
              </div>
            )}

            <ul className="vs-flow-list">
              {data.flows.map((flow) => (
                <FlowRow
                  key={flow.flowId}
                  flow={flow}
                  projectId={data.project.id}
                  busy={busy}
                  onToggle={setFlowStatus}
                  onDelete={deleteFlow}
                />
              ))}
            </ul>

            {data.blockedFlowCount > 0 && (
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--vs-line)" }}>
                <p className="vs-hint">
                  결제·발송·삭제처럼 되돌릴 수 없는 흐름 {data.blockedFlowCount}개는 안전을 위해
                  실행하지 않습니다. 켤 수도 없습니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 최근 30일 */}
        <div className="vs-grid-3">
          <div className="vs-stat">
            <div className="vs-clean-days" data-state={data.stats.cleanDays > 0 ? "ok" : "unknown"}>
              {data.stats.cleanDays}
              <span style={{ fontSize: 15, fontWeight: 600, marginLeft: 3 }}>일</span>
            </div>
            <div className="vs-stat-label">연속 무사고</div>
          </div>
          <div className="vs-stat">
            <div className="vs-stat-value">{data.stats.runs30d}</div>
            <div className="vs-stat-label">최근 30일 검사</div>
          </div>
          <div className="vs-stat">
            <div className="vs-stat-value">{data.stats.incidents30d}</div>
            <div className="vs-stat-label">최근 30일 문제 발견</div>
          </div>
          <div className="vs-stat">
            <div className="vs-stat-value">{data.activeFlowCount}</div>
            <div className="vs-stat-label">확인 중인 흐름</div>
          </div>
        </div>

        <div className="vs-row">
          <Link href={`/vibesafe/projects/${data.project.id}/history`} className="vs-btn vs-btn-sm">
            안정성 이력
          </Link>
          <Link href={`/vibesafe/projects/${data.project.id}/runs`} className="vs-btn vs-btn-sm">
            검사 기록
          </Link>
          <Link href={`/vibesafe/projects/${data.project.id}/repairs`} className="vs-btn vs-btn-sm">
            수정 이력
          </Link>
          <Link href={`/vibesafe/projects/${data.project.id}/security`} className="vs-btn vs-btn-sm">
            보안 점검
          </Link>
          <Link href={`/vibesafe/projects/${data.project.id}/permissions`} className="vs-btn vs-btn-sm">
            권한
          </Link>
          <Link href={`/vibesafe/projects/${data.project.id}/share`} className="vs-btn vs-btn-sm">
            상태 배지
          </Link>
        </div>

        {/* 보안 점검 요약 — 자세한 건 전용 화면에서 */}
        {data.findings.length > 0 && (
          <div className="vs-card vs-card-flush">
            <div className="vs-card-head">
              <h2 className="vs-section-title">눈에 띈 위험 {data.findings.length}건</h2>
              <span className="vs-badge" data-tone="neutral">참고용</span>
            </div>
            <ul className="vs-flow-list">
              {data.findings.map((finding) => (
                <li className="vs-flow-item" key={finding.id} style={{ alignItems: "flex-start" }}>
                  <span
                    className="vs-badge"
                    data-tone={finding.severity === "high" ? "down" : finding.severity === "medium" ? "warn" : "neutral"}
                  >
                    {finding.severity === "high" ? "높음" : finding.severity === "medium" ? "보통" : "낮음"}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="vs-flow-name">{finding.title}</div>
                    <p className="vs-flow-desc">{finding.advice}</p>
                    <p className="vs-flow-desc vs-mono">
                      {finding.filePath}
                      {finding.line ? `:${finding.line}` : ""} — {finding.evidence}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--vs-line)" }}>
              <p className="vs-hint">
                전문 보안 점검 도구가 아닙니다. 자주 나는 실수 몇 가지만 표시합니다.
                발견한 값 자체는 저장하지 않습니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FlowRow({
  flow,
  projectId,
  busy,
  onToggle,
  onDelete,
}: {
  flow: ProjectDashboard["flows"][number];
  projectId: string;
  busy: string | null;
  onToggle: (flowId: string, status: "active" | "disabled") => void;
  onDelete: (flowId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const blocked = flow.riskLevel === "blocked";

  const dotState =
    flow.status !== "active"
      ? "unknown"
      : flow.lastResult === "passed"
        ? "ok"
        : flow.lastResult === "failed"
          ? "down"
          : "unknown";

  return (
    <li className="vs-flow-item" style={{ flexWrap: "wrap" }}>
      <span className="vs-status-dot" data-state={dotState} />
      <div style={{ minWidth: 0, flex: "1 1 200px" }}>
        <div className="vs-row" style={{ gap: 7 }}>
          <span className="vs-flow-name">{flow.title}</span>
          <span className="vs-badge" data-tone="neutral">
            {CATEGORY_LABELS[flow.category] ?? flow.category}
          </span>
          {blocked && <span className="vs-badge" data-tone="down">실행 제외</span>}
          {flow.riskLevel === "caution" && flow.status === "active" && (
            <span className="vs-badge" data-tone="warn">데이터 변경</span>
          )}
        </div>
        {flow.description && <p className="vs-flow-desc">{flow.description}</p>}
        {blocked && flow.riskReason && <p className="vs-flow-desc">{flow.riskReason}</p>}
        {!blocked && flow.riskLevel === "caution" && flow.status !== "active" && flow.riskReason && (
          <p className="vs-flow-desc">{flow.riskReason} 켜기 전에 확인해주세요.</p>
        )}
      </div>

      <span className="vs-spacer" />

      <div className="vs-row" style={{ gap: 6 }}>
        {flow.status === "active" && flow.lastResult && (
          <span className="vs-badge" data-tone={flow.lastResult === "passed" ? "ok" : "down"}>
            {flow.lastResult === "passed" ? "정상" : "실패"}
          </span>
        )}
        <button
          type="button"
          className="vs-btn vs-btn-ghost vs-btn-sm"
          onClick={() => setExpanded((v) => !v)}
        >
          단계 {flow.stepCount}개
        </button>
        {!blocked &&
          (flow.status === "active" ? (
            <button
              type="button"
              className="vs-btn vs-btn-sm"
              onClick={() => onToggle(flow.flowId, "disabled")}
              disabled={busy !== null}
            >
              끄기
            </button>
          ) : (
            <button
              type="button"
              className="vs-btn vs-btn-primary vs-btn-sm"
              onClick={() => onToggle(flow.flowId, "active")}
              disabled={busy !== null}
            >
              켜기
            </button>
          ))}
        <Link href={`/vibesafe/projects/${projectId}/flows/${flow.flowId}`} className="vs-btn vs-btn-sm">
          수정
        </Link>
        <button
          type="button"
          className="vs-btn vs-btn-danger vs-btn-sm"
          onClick={() => onDelete(flow.flowId)}
          disabled={busy !== null}
        >
          삭제
        </button>
      </div>

      {expanded && <FlowSteps projectId={projectId} flowId={flow.flowId} />}
    </li>
  );
}

function FlowSteps({ projectId, flowId }: { projectId: string; flowId: string }) {
  const [steps, setSteps] = useState<
    { action: string; description: string; selector: string | null; value: string | null }[] | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/vibesafe/projects/${projectId}/flows/${flowId}/steps`);
      if (!res.ok) return;
      const data = (await res.json()) as { steps?: typeof steps };
      if (!cancelled) setSteps(data.steps ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, flowId]);

  return (
    <div style={{ flexBasis: "100%", marginTop: 10 }}>
      {steps === null ? (
        <p className="vs-hint">불러오는 중…</p>
      ) : (
        <ol className="vs-hint" style={{ paddingLeft: 20, margin: 0 }}>
          {steps.map((step, index) => (
            <li key={index}>
              <strong>{ACTION_LABELS[step.action as FlowAction] ?? step.action}</strong> —{" "}
              {step.description}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
