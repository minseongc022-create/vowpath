"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { formatDateKR, formatDateTimeKR } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/quote-calculator";
import { getCompany, getCrews, getJob, updateJobStatus } from "@/lib/store";
import type { Job, JobStatus } from "@/lib/types";

const FLOW: JobStatus[] = [
  "confirmed",
  "dispatched",
  "loading",
  "moving",
  "done",
];

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const company = getCompany();
  const isOwnerView =
    typeof window !== "undefined" &&
    window.location.search.includes("owner=1");

  useEffect(() => {
    setJob(getJob(id) ?? null);
  }, [id]);

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card>이사 정보를 찾을 수 없습니다.</Card>
      </div>
    );
  }

  const crew = getCrews().find((c) => c.id === job.crewId);
  const currentIdx = FLOW.indexOf(
    job.status === "quote" ? "confirmed" : (job.status as (typeof FLOW)[number]),
  );

  function advanceStatus() {
    const idx = FLOW.indexOf(job!.status as (typeof FLOW)[number]);
    const next = FLOW[idx + 1];
    if (next) {
      updateJobStatus(job!.id, next);
      setJob(getJob(job!.id) ?? null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-lg space-y-4 py-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-orange-600">{company.name}</p>
          <h1 className="mt-1 text-2xl font-black">이사 진행상황</h1>
          <p className="text-sm text-slate-500">
            {job.customerName} · {formatDateKR(job.moveDate)}
          </p>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <p className="font-bold">현재 상태</p>
            <Badge tone="orange">{STATUS_LABEL[job.status]}</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {FLOW.map((step, i) => {
              const done = i <= currentIdx && job.status !== "quote";
              const active = i === currentIdx;
              return (
                <div key={step} className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      done
                        ? "bg-orange-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    } ${active ? "ring-4 ring-orange-100" : ""}`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <div>
                    <p
                      className={`font-medium ${done ? "text-slate-900" : "text-slate-400"}`}
                    >
                      {STATUS_LABEL[step]}
                    </p>
                    {active && crew && step === "dispatched" && (
                      <p className="text-sm text-slate-500">
                        담당: {crew.name} ({crew.leaderPhone})
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">이사 경로</p>
          <p className="mt-2 font-medium">{job.from.line}</p>
          <p className="my-1 text-center text-slate-300">↓</p>
          <p className="font-medium">{job.to.line}</p>
        </Card>

        {job.statusHistory.length > 0 && (
          <Card>
            <p className="font-bold">업데이트 기록</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[...job.statusHistory].reverse().map((h, i) => (
                <li key={i} className="flex justify-between text-slate-600">
                  <span>{STATUS_LABEL[h.status]}</span>
                  <span className="text-slate-400">
                    {formatDateTimeKR(h.at)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {isOwnerView && job.status !== "done" && job.status !== "cancelled" && (
          <Button className="w-full" onClick={advanceStatus}>
            다음 단계로 업데이트 (사장님용)
          </Button>
        )}

        <p className="text-center text-xs text-slate-400">
          문의: {company.phone}
        </p>
      </div>
    </div>
  );
}
