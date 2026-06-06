"use client";

import { useCallback, useEffect, useState } from "react";
import { settingsPage } from "@/lib/content";
import type { OpsFailureRecord } from "@/lib/ops-failures";

type CollapsedFailure = OpsFailureRecord & { repeatCount?: number };

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const CATEGORY_LABEL: Record<OpsFailureRecord["category"], string> = {
  twilio: "Twilio",
  ai: "AI",
  jobber: "Jobber",
  sms: "SMS",
  email: "이메일",
  address: "주소",
  intake: "접수",
  storage: "저장소",
};

function isTwilioSmsConfigError(row: CollapsedFailure): boolean {
  return (
    row.category === "sms" &&
    row.retryable &&
    /twilio|문자 전송|문자 발송/i.test(row.message)
  );
}

export function OpsFailuresPanel() {
  const [failures, setFailures] = useState<CollapsedFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/failures", { credentials: "same-origin" });
      if (!res.ok) {
        setError(
          res.status === 401
            ? "로그인 후 오류 기록을 볼 수 있습니다."
            : "오류 기록을 불러오지 못했습니다.",
        );
        setFailures([]);
        return;
      }
      const data = (await res.json()) as { failures?: CollapsedFailure[] };
      setFailures(data.failures ?? []);
    } catch {
      setError("네트워크 오류로 오류 기록을 불러오지 못했습니다.");
      setFailures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15_000);
    return () => window.clearInterval(poll);
  }, [load]);

  async function handleClear() {
    if (!confirm(settingsPage.opsFailuresClearConfirm)) return;
    setClearing(true);
    try {
      const res = await fetch("/api/ops/failures", {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        setFailures([]);
      }
    } finally {
      setClearing(false);
    }
  }

  if (!loading && !error && failures.length === 0) {
    return null;
  }

  const twilioSmsOnly =
    failures.length > 0 && failures.every(isTwilioSmsConfigError);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {settingsPage.opsFailuresTitle}
          </p>
          <p className="mt-1 text-sm text-slate-600">{settingsPage.opsFailuresDescription}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "…" : settingsPage.auditRefresh}
          </button>
          {failures.length > 0 ? (
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={clearing}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {clearing ? "…" : settingsPage.opsFailuresClear}
            </button>
          ) : null}
        </div>
      </div>

      {twilioSmsOnly ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {settingsPage.opsFailuresTwilioHint}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      {loading && failures.length === 0 ? (
        <ul className="mt-4 space-y-2" aria-busy="true">
          {[0, 1].map((i) => (
            <li key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </ul>
      ) : null}

      {failures.length > 0 ? (
        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {failures.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-800">
                <span>{CATEGORY_LABEL[row.category]}</span>
                <span className="text-rose-300">·</span>
                <span className="normal-case text-slate-600">{row.operation}</span>
                {(row.repeatCount ?? 1) > 1 ? (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-900">
                    {settingsPage.opsFailuresRepeatCount(row.repeatCount ?? 1)}
                  </span>
                ) : null}
                {row.retryable ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium normal-case text-slate-600 ring-1 ring-slate-200">
                    {settingsPage.opsFailuresRetryable}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-800">{row.message}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatWhen(row.createdAt)}
                {row.callSid ? ` · Call ${row.callSid.slice(0, 10)}…` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
