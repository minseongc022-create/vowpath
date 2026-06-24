"use client";

import { useEffect, useState } from "react";
import { inboundCalls as copy } from "@/lib/content";
import { PriorityBadge } from "@/components/dashboard/PriorityBadge";
import type { JobPriority } from "@/lib/types";

type CallLogItem = {
  id: string;
  from: string;
  priority?: JobPriority;
  symptom?: string;
  customerName?: string;
  address?: string;
  transcript: string;
  jobberRequestId?: string;
  createdAt: string;
};

export function InboundCalls() {
  const [calls, setCalls] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  function loadCalls() {
    setLoading(true);
    fetch("/api/calls")
      .then((r) => r.json())
      .then((d: { calls?: CallLogItem[] }) => setCalls(d.calls ?? []))
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCalls();
    const onUpdate = () => loadCalls();
    window.addEventListener("effiroad:calls-updated", onUpdate);
    return () => window.removeEventListener("effiroad:calls-updated", onUpdate);
  }, []);

  return (
    <section className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{copy.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={loadCalls}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">{copy.loading}</p>
      ) : calls.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-surface-border bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
          {copy.empty}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {calls.map((call) => (
            <li
              key={call.id}
              className="rounded-lg border border-surface-border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={call.priority} showCode />
                  <span className="text-xs font-medium text-slate-700">
                    {call.symptom ?? "Call"}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(call.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {call.customerName ?? copy.unknownCustomer}
              </p>
              <p className="text-xs text-slate-500">{call.from}</p>
              {call.address ? (
                <p className="mt-1 text-sm text-slate-700">{call.address}</p>
              ) : null}
              <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                {call.transcript}
              </p>
              {call.jobberRequestId ? (
                <p className="mt-1 text-xs text-brand-700">
                  Jobber: {call.jobberRequestId}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
