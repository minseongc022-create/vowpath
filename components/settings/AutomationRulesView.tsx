"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { summarizeWorkflowRule } from "@/lib/workflow-rules/format";
import type { WorkflowRule } from "@/lib/workflow-rules/types";
import { WorkflowRuleEditor } from "@/components/settings/WorkflowRuleEditor";

export function AutomationRulesView() {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResults, setSimResults] = useState<
    { bookingId: string; issueType: string; summary: string }[]
  >([]);

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
    const ok = window.confirm(`Delete "${rule.name}"? This cannot be undone.`);
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Automation</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Automation Rules</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            IF/THEN rules run when customers pick a time. Create rules in Effiroad AI or manage them here.
          </p>
        </div>
        <Link
          href="/dashboard/ai"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Create with AI
        </Link>
        <button
          type="button"
          onClick={() => setShowEditor((v) => !v)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Manual rule
        </button>
        <button
          type="button"
          disabled={simulating || rules.length === 0}
          onClick={() => void runSimulation()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          {simulating ? "Simulating..." : "Simulate (30d)"}
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
            Simulation matches ({simResults.length})
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
        <p className="mt-6 text-sm text-slate-500">Loading...</p>
      ) : rules.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No automation rules yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Try: &quot;Auto approve No Cooling&quot; or &quot;Weekend bookings need approval&quot;
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
                      {rule.enabled ? "Active" : "Off"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    {summarizeWorkflowRule(rule, "en")}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Created: {new Date(rule.createdAt).toLocaleDateString("en-US")}
                    {" · "}
                    Updated: {new Date(rule.updatedAt).toLocaleDateString("en-US")}
                    {typeof rule.matchCount === "number" && rule.matchCount > 0 ? (
                      <>
                        {" · "}
                        Matched: {rule.matchCount}
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
                    {rule.enabled ? "Turn off" : "Turn on"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === rule.id}
                    onClick={() => void deleteRule(rule)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
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
