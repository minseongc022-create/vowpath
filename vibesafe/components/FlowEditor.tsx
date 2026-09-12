"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ACTION_LABELS, FLOW_ACTIONS, type FlowAction } from "../lib/flows/steps";

type Step = {
  action: string;
  selector: string | null;
  value: string | null;
  secretRef: string | null;
  description: string;
  optional: boolean;
};

/**
 * 흐름 수정 화면.
 *
 * AI가 찾은 흐름이 조금 틀렸을 때 지우는 것 말고 고칠 방법이 있어야 한다 —
 * 그렇지 않으면 사용자는 "거의 맞는" 흐름을 통째로 버린다.
 */
export function FlowEditor({ projectId, flowId }: { projectId: string; flowId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [riskLevel, setRiskLevel] = useState<string>("safe");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/vibesafe/projects/${projectId}/flows/${flowId}/steps`);
      const data = (await res.json()) as {
        flow?: { title: string; description: string | null; riskLevel: string };
        steps?: Step[];
        error?: string;
      };
      if (!res.ok || !data.flow) {
        setError(data.error ?? "흐름을 불러오지 못했습니다.");
        setSteps([]);
        return;
      }
      setTitle(data.flow.title);
      setDescription(data.flow.description ?? "");
      setRiskLevel(data.flow.riskLevel);
      setSteps(data.steps ?? []);
    })();
  }, [projectId, flowId]);

  function updateStep(index: number, patch: Partial<Step>) {
    setSteps((current) =>
      current ? current.map((step, i) => (i === index ? { ...step, ...patch } : step)) : current,
    );
  }

  function removeStep(index: number) {
    setSteps((current) => (current ? current.filter((_, i) => i !== index) : current));
  }

  function addStep() {
    setSteps((current) => [
      ...(current ?? []),
      { action: "expect_text", selector: null, value: "", secretRef: null, description: "", optional: false },
    ]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!steps || busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/vibesafe/projects/${projectId}/flows/${flowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, steps }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; riskLevel?: string };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "저장하지 못했습니다.");
      return;
    }
    if (data.riskLevel) setRiskLevel(data.riskLevel);
    setSaved(true);
    router.refresh();
  }

  if (steps === null) {
    return (
      <div className="vs-container-narrow">
        <p className="vs-hint">불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="vs-container">
      <form className="vs-stack" onSubmit={save} style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="vs-row-between">
          <h1 className="vs-page-title">흐름 수정</h1>
          <Link href={`/vibesafe/projects/${projectId}`} className="vs-btn vs-btn-sm">
            돌아가기
          </Link>
        </div>

        {error && (
          <div className="vs-alert" data-tone="error" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className="vs-alert" data-tone="ok" role="status">
            저장했습니다.
            {riskLevel === "blocked" &&
              " 위험한 단계가 포함되어 이 흐름은 실행되지 않도록 꺼졌습니다."}
          </div>
        )}

        <div className="vs-card vs-stack">
          <div className="vs-field">
            <label className="vs-label" htmlFor="vs-flow-title">
              이름
            </label>
            <input
              id="vs-flow-title"
              className="vs-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              required
            />
          </div>
          <div className="vs-field">
            <label className="vs-label" htmlFor="vs-flow-desc">
              설명
            </label>
            <input
              id="vs-flow-desc"
              className="vs-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
          </div>
        </div>

        <div className="vs-card vs-stack">
          <div className="vs-row-between">
            <h2 className="vs-section-title">단계</h2>
            <button type="button" className="vs-btn vs-btn-sm" onClick={addStep}>
              단계 추가
            </button>
          </div>

          <p className="vs-hint">
            선택자는 <code>role:button|로그인</code>, <code>text:예약하기</code>,{" "}
            <code>label:이메일</code>, <code>placeholder:이메일</code>,{" "}
            <code>testid:submit</code>, <code>css:#id</code> 형식으로 씁니다. 화면에 보이는
            글자로 지목할 수 있으면 그쪽이 더 안정적입니다.
          </p>

          {steps.map((step, index) => (
            <div
              key={index}
              className="vs-stack-sm"
              style={{
                border: "1px solid var(--vs-line)",
                borderRadius: "var(--vs-radius-sm)",
                padding: 12,
              }}
            >
              <div className="vs-row">
                <span className="vs-badge" data-tone="neutral">
                  {index + 1}
                </span>
                <select
                  className="vs-select vs-input-sm"
                  style={{ width: "auto" }}
                  value={step.action}
                  onChange={(e) => updateStep(index, { action: e.target.value })}
                >
                  {FLOW_ACTIONS.map((action) => (
                    <option key={action} value={action}>
                      {ACTION_LABELS[action as FlowAction]}
                    </option>
                  ))}
                </select>
                <span className="vs-spacer" />
                {step.secretRef && (
                  <span className="vs-badge" data-tone="info">
                    테스트 계정 {step.secretRef === "username" ? "아이디" : "비밀번호"}
                  </span>
                )}
                <button
                  type="button"
                  className="vs-btn vs-btn-danger vs-btn-sm"
                  onClick={() => removeStep(index)}
                >
                  삭제
                </button>
              </div>

              <input
                className="vs-input vs-input-sm"
                placeholder="이 단계에서 무엇을 하나요? (예: 로그인 버튼 누르기)"
                value={step.description}
                onChange={(e) => updateStep(index, { description: e.target.value })}
                maxLength={200}
              />
              <input
                className="vs-input vs-input-sm"
                placeholder="선택자 (예: role:button|로그인)"
                value={step.selector ?? ""}
                onChange={(e) => updateStep(index, { selector: e.target.value || null })}
                maxLength={300}
              />
              {!step.secretRef && (
                <input
                  className="vs-input vs-input-sm"
                  placeholder="값 (goto는 /경로, expect_text는 확인할 글자)"
                  value={step.value ?? ""}
                  onChange={(e) => updateStep(index, { value: e.target.value || null })}
                  maxLength={500}
                />
              )}
              <label className="vs-hint" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={step.optional}
                  onChange={(e) => updateStep(index, { optional: e.target.checked })}
                />
                실패해도 계속 진행 (선택 단계)
              </label>
            </div>
          ))}
        </div>

        <button className="vs-btn vs-btn-primary" type="submit" disabled={busy}>
          {busy ? "저장 중…" : "저장하기"}
        </button>
      </form>
    </div>
  );
}
