"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useIsEnglishUi } from "@/components/providers/LocaleProvider";
import { summarizeWorkflowRule } from "@/lib/workflow-rules/format";
import type { WorkflowRule } from "@/lib/workflow-rules/types";
import { WorkflowRuleEditor } from "@/components/settings/WorkflowRuleEditor";

export function AutomationRulesView() {
  const isEnglish = useIsEnglishUi();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResults, setSimResults] = useState<
    { bookingId: string; issueType: string; summary: string }[]
  >([]);

  const locale = isEnglish ? "en" : "ko";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow-rules");
      const data = (await res.json()) as { rules?: WorkflowRule[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setRules(data.rules ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleRule(rule: WorkflowRule) {
    setBusyId(rule.id);
    try {
      const res = await fetch(`/api/workflow-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      const data = (await res.json()) as { rule?: WorkflowRule; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      if (data.rule) {
        setRules((prev) => prev.map((r) => (r.id === data.rule!.id ? data.rule! : r)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function runSimulation() {
    setSimulating(true);
    setSimResults([]);
    try {
      const res = await fetch("/api/workflow-rules/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 30 }),
      });
      const data = (await res.json()) as {
        results?: { bookingId: string; issueType: string; summary: string }[];
      };
      setSimResults(data.results ?? []);
    } finally {
      setSimulating(false);
    }
  }

  async function deleteRule(rule: WorkflowRule) {
    const ok = window.confirm(
      isEnglish
        ? `Delete "${rule.name}"? This cannot be undone.`
        : `"${rule.name}" 규칙을 삭제할까요? 되돌릴 수 없습니다.`,
    );
    if (!ok) return;
    setBusyId(rule.id);
    try {
      const res = await fetch(`/api/workflow-rules/${rule.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Delete failed");
      }
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isEnglish ? "Automation" : "자동화"}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            {isEnglish ? "Automation Rules" : "운영 규칙"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {isEnglish
              ? "IF/THEN rules run when customers pick a time. Create rules in Vowpath AI or manage them here."
              : "고객이 시간을 선택할 때 IF/THEN 규칙이 실행됩니다. Vowpath AI로 만들거나 여기서 관리하세요."}
          </p>
        </div>
        <Link
          href="/dashboard/ai"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {isEnglish ? "Create with AI" : "AI로 만들기"}
        </Link>
        <button
          type="button"
          onClick={() => setShowEditor((v) => !v)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          {isEnglish ? "Manual rule" : "직접 만들기"}
        </button>
        <button
          type="button"
          disabled={simulating || rules.length === 0}
          onClick={() => void runSimulation()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          {simulating
            ? isEnglish
              ? "Simulating..."
              : "시뮬레이션 중..."
            : isEnglish
              ? "Simulate (30d)"
              : "시뮬레이션 (30일)"}
        </button>
      </div>

      {showEditor ? (
        <WorkflowRuleEditor
          onSaved={() => {
            setShowEditor(false);
            void load();
          }}
          onCancel={() => setShowEditor(false)}
        />
      ) : null}

      {simResults.length > 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-slate-800">
            {isEnglish ? "Simulation matches" : "시뮬레이션 결과"} ({simResults.length})
          </p>
          <ul className="mt-2 space-y-1 text-slate-700">
            {simResults.slice(0, 8).map((r) => (
              <li key={r.bookingId}>
                {r.issueType} — {r.summary}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">{isEnglish ? "Loading..." : "불러오는 중..."}</p>
      ) : rules.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">
            {isEnglish ? "No automation rules yet" : "저장된 운영 규칙이 없습니다"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {isEnglish
              ? 'Try: "Auto approve No Cooling" or "Weekend bookings need approval"'
              : '"No Cooling은 자동 승인해줘" 또는 "주말 예약은 승인 필요"'}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        rule.enabled
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {rule.enabled
                        ? isEnglish
                          ? "Active"
                          : "활성"
                        : isEnglish
                          ? "Off"
                          : "비활성"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    {summarizeWorkflowRule(rule, locale)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {isEnglish ? "Created" : "생성"}:{" "}
                    {new Date(rule.createdAt).toLocaleDateString(isEnglish ? "en-US" : "ko-KR")}
                    {" · "}
                    {isEnglish ? "Updated" : "수정"}:{" "}
                    {new Date(rule.updatedAt).toLocaleDateString(isEnglish ? "en-US" : "ko-KR")}
                    {typeof rule.matchCount === "number" && rule.matchCount > 0 ? (
                      <>
                        {" · "}
                        {isEnglish ? "Matched" : "적용"}: {rule.matchCount}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busyId === rule.id}
                    onClick={() => void toggleRule(rule)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {rule.enabled
                      ? isEnglish
                        ? "Turn off"
                        : "끄기"
                      : isEnglish
                        ? "Turn on"
                        : "켜기"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === rule.id}
                    onClick={() => void deleteRule(rule)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isEnglish ? "Delete" : "삭제"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
