"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dashboardPage } from "@/lib/content";
import { settingsSectionHref } from "@/lib/integration-status";
import { useShopState } from "@/lib/hooks/use-shop-state";
import type { JobCard } from "@/lib/types";
import { InboundCalls } from "@/components/dashboard/InboundCalls";
import { JobCardGenerator } from "@/components/dashboard/JobCardGenerator";
import { IntegrationStatusBanner } from "@/components/settings/IntegrationStatusBanner";
import { formatPriority } from "@/lib/priority-labels";
import { readJobs } from "@/lib/shop-storage";

type CallLog = {
  id: string;
  from: string;
  priority?: "P1" | "P2" | "P3";
  symptom?: string;
  customerName?: string;
  transcript: string;
  createdAt: string;
};

function priorityClass(p: JobCard["priority"]) {
  if (p === "P1") return "text-red-700 bg-red-50 border-red-100";
  if (p === "P2") return "text-amber-800 bg-amber-50 border-amber-100";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

export function DashboardView() {
  const { shop } = useShopState();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [panel, setPanel] = useState<null | "tonight" | "bookings" | "pending">(
    null,
  );

  useEffect(() => {
    setJobs(readJobs());
    fetch("/api/calls")
      .then((r) => r.json())
      .then((d: { calls?: CallLog[] }) =>
        setCalls(
          [...(d.calls ?? [])].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        ),
      )
      .catch(() => setCalls([]));
  }, []);

  const bookings = jobs.filter(
    (j) => j.status === "confirmed" || j.status === "sms_sent",
  );
  const pending = jobs.filter((j) => j.status === "pending_approval");

  return (
    <div className="space-y-8">
      <IntegrationStatusBanner />

      <JobCardGenerator
        onSaved={(job) => {
          setJobs((prev) => [job, ...prev]);
        }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={dashboardPage.stats.tonightCalls}
          value={String(calls.length)}
          onClick={() => setPanel("tonight")}
        />
        <StatCard
          label={dashboardPage.stats.bookings}
          value={String(bookings.length)}
          onClick={() => setPanel("bookings")}
        />
        <StatCard
          label={dashboardPage.stats.pendingApproval}
          value={String(pending.length)}
          onClick={() => setPanel("pending")}
        />
      </div>

      {panel ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-24"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-xl border border-surface-border bg-white shadow-card">
            <div className="flex items-center justify-between gap-4 border-b border-surface-border px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {panel === "tonight"
                    ? dashboardPage.stats.tonightCalls
                    : panel === "bookings"
                      ? dashboardPage.stats.bookings
                      : dashboardPage.stats.pendingApproval}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {panel === "tonight"
                    ? shop.answerScheduleActive
                      ? shop.scheduleWindows.map((w) => w.label).join(" · ") ||
                        "수신 시간대 미설정"
                      : "AI 수신 시간대가 아직 연결되지 않았습니다"
                    : panel === "bookings"
                      ? "Jobber에 확정된 예약 목록"
                      : "아직 Jobber에 확정되지 않은 요청 목록"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto px-5 py-4">
              {panel === "tonight" ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-surface-border bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">AI 수신 시간대</p>
                    {!shop.answerScheduleActive || shop.scheduleWindows.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">
                        시간대를 설정하고 확인을 누르면 AI가 해당 시간에 콜을 받습니다.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {shop.scheduleWindows.map((w) => (
                          <li key={w.id} className="text-sm text-slate-800">
                            {w.label}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href={settingsSectionHref("schedule")}
                      className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
                    >
                      {dashboardPage.scheduleEdit}
                    </Link>
                  </div>

                  <div className="rounded-lg border border-surface-border bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      인바운드 통화 ({calls.length})
                    </p>
                    {calls.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">
                        아직 기록된 통화가 없습니다.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {calls.map((call) => (
                          <li
                            key={call.id}
                            className="rounded-lg border border-surface-border bg-slate-50 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-slate-900">
                                {call.customerName || call.from}
                              </p>
                              <span className="text-xs text-slate-500">
                                {new Date(call.createdAt).toLocaleString("ko-KR")}
                              </span>
                            </div>
                            {call.symptom ? (
                              <p className="mt-1 text-sm text-slate-600">{call.symptom}</p>
                            ) : null}
                            <p className="mt-2 text-sm text-slate-700">{call.transcript}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}

              {panel === "bookings" ? (
                <div>
                  {bookings.length === 0 ? (
                    <p className="text-sm text-slate-600">Jobber에 확정된 예약이 아직 없습니다.</p>
                  ) : (
                    <ul className="space-y-3">
                      {bookings.map((j) => (
                        <li
                          key={j.id}
                          className="rounded-lg border border-surface-border bg-white p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${priorityClass(j.priority)}`}
                            >
                              {formatPriority(j.priority)} · {j.symptom}
                            </span>
                            <span className="text-xs text-slate-500">
                              {dashboardPage.jobStatus[j.status]}
                            </span>
                          </div>
                          <p className="mt-2 font-medium text-slate-900">{j.customerName}</p>
                          <p className="mt-1 text-sm text-slate-600">{j.address}</p>
                          <p className="mt-2 text-sm text-slate-700">{j.arrivalWindow}</p>
                          {j.jobberJobId ? (
                            <p className="mt-1 text-xs text-brand-700">{j.jobberJobId}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {panel === "pending" ? (
                <div>
                  {pending.length === 0 ? (
                    <p className="text-sm text-slate-600">승인 대기 요청이 아직 없습니다.</p>
                  ) : (
                    <ul className="space-y-3">
                      {pending.map((j) => (
                        <li
                          key={j.id}
                          className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${priorityClass(j.priority)}`}
                            >
                              {formatPriority(j.priority)} · {j.symptom}
                            </span>
                            <span className="text-xs font-semibold text-amber-900">
                              {dashboardPage.jobStatus[j.status]}
                            </span>
                          </div>
                          <p className="mt-2 font-medium text-slate-900">{j.customerName}</p>
                          <p className="mt-1 text-sm text-slate-600">{j.address}</p>
                          <p className="mt-2 text-sm text-slate-700">{j.arrivalWindow}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <section className="hvac-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {dashboardPage.scheduleTitle}
          </h2>
          <Link
            href={settingsSectionHref("schedule")}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            {dashboardPage.scheduleEdit}
          </Link>
        </div>
        {!shop.answerScheduleActive || shop.scheduleWindows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-4 py-5 text-center">
            <p className="text-sm text-slate-600">{dashboardPage.scheduleEmpty}</p>
            <Link
              href={settingsSectionHref("schedule")}
              className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {dashboardPage.scheduleSetup}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {shop.scheduleWindows.map((w) => (
              <li
                key={w.id}
                className="rounded-lg border border-brand-100 bg-brand-50/50 px-4 py-3"
              >
                <p className="text-sm text-slate-800">{w.label}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div id="inbound-calls">
        <InboundCalls />
      </div>

      <section className="hvac-card p-6">
        <h2 className="text-lg font-semibold text-slate-900">{dashboardPage.jobsTitle}</h2>

        {jobs.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-surface-border bg-slate-50 px-6 py-12 text-center">
            <p className="font-medium text-slate-900">{dashboardPage.jobsEmptyTitle}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              {dashboardPage.jobsEmptyBody}
            </p>
            <p className="mt-4 text-xs text-slate-500">{dashboardPage.jobsEmptyHint}</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="rounded-lg border border-surface-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${priorityClass(job.priority)}`}
                  >
                    {formatPriority(job.priority)} · {job.symptom}
                  </span>
                  <span className="text-xs text-slate-500">
                    {dashboardPage.jobStatus[job.status]}
                  </span>
                </div>
                <p className="mt-2 font-medium text-slate-900">{job.customerName}</p>
                <p className="text-sm text-slate-600">{job.address}</p>
                <p className="mt-2 text-sm text-slate-700">{job.arrivalWindow}</p>
                {job.jobberJobId && (
                  <p className="mt-1 text-xs text-brand-700">{job.jobberJobId}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick);

  const classes = "hvac-card p-5";

  return (
    <div className={classes}>
      {clickable ? (
        <button
          type="button"
          onClick={onClick}
          className="block w-full text-left focus:outline-none"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </button>
      ) : (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </>
      )}
    </div>
  );
}
