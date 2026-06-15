"use client";

import { useState } from "react";
import { useIsEnglishUi } from "@/components/providers/LocaleProvider";
import type {
  ConditionMatchMode,
  WorkflowAction,
  WorkflowCondition,
  WorkflowRuleDraft,
} from "@/lib/workflow-rules/types";

const ISSUE_PRESETS = ["No Cooling", "No Heat", "Gas Smell", "Water Leak"];

export function WorkflowRuleEditor({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEnglish = useIsEnglishUi();
  const [name, setName] = useState("");
  const [issue, setIssue] = useState(ISSUE_PRESETS[0]);
  const [conditionMatch, setConditionMatch] = useState<ConditionMatchMode>("all");
  const [action, setAction] = useState<WorkflowAction["type"]>("auto_approve");
  const [weekend, setWeekend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const conditions: WorkflowCondition[] = [];
    if (weekend) {
      conditions.push({ type: "booking_day_in", days: ["sat", "sun"] });
    } else {
      conditions.push({ type: "issue_contains", value: issue });
    }
    const actions: WorkflowAction[] = [];
    if (action === "auto_approve") actions.push({ type: "auto_approve" });
    if (action === "require_manual_approval") actions.push({ type: "require_manual_approval" });
    if (action === "set_priority") actions.push({ type: "set_priority", value: "P1" });
    if (action === "send_owner_sms") actions.push({ type: "send_owner_sms" });

    const draft: WorkflowRuleDraft = {
      name: name.trim() || (isEnglish ? `${issue} rule` : `${issue} 규칙`),
      enabled: true,
      priority: 50,
      source: "manual",
      conditionMatch,
      conditions,
      actions,
    };

    try {
      const res = await fetch("/api/workflow-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <h3 className="font-semibold text-slate-900">
        {isEnglish ? "New automation rule" : "새 운영 규칙"}
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-600">
            {isEnglish ? "Rule name" : "규칙 이름"}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder={isEnglish ? "No Cooling auto approve" : "No Cooling 자동 승인"}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={weekend} onChange={(e) => setWeekend(e.target.checked)} className="mr-2" />
            {isEnglish ? "Weekend only" : "주말만"}
          </span>
          {!weekend ? (
            <select
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {ISSUE_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : null}
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">
            {isEnglish ? "Condition match" : "조건 결합"}
          </span>
          <select
            value={conditionMatch}
            onChange={(e) => setConditionMatch(e.target.value as ConditionMatchMode)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">{isEnglish ? "All (AND)" : "모두 (AND)"}</option>
            <option value="any">{isEnglish ? "Any (OR)" : "하나라도 (OR)"}</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-slate-600">
            {isEnglish ? "Then action" : "동작"}
          </span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as WorkflowAction["type"])}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="auto_approve">{isEnglish ? "Auto approve" : "자동 승인"}</option>
            <option value="require_manual_approval">{isEnglish ? "Manual approval" : "수동 승인"}</option>
            <option value="set_priority">{isEnglish ? "Set P1 urgent" : "P1 긴급"}</option>
            <option value="send_owner_sms">{isEnglish ? "Send owner SMS" : "업주 SMS"}</option>
          </select>
        </label>
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? (isEnglish ? "Saving..." : "저장 중...") : isEnglish ? "Save rule" : "규칙 저장"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          {isEnglish ? "Cancel" : "취소"}
        </button>
      </div>
    </div>
  );
}
