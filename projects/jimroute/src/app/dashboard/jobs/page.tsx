"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { formatDateKR, formatKRW, shortId } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/quote-calculator";
import { getJobs, updateJobStatus } from "@/lib/store";
import type { Job } from "@/lib/types";

function statusTone(status: Job["status"]) {
  if (status === "done") return "green" as const;
  if (status === "cancelled") return "red" as const;
  if (status === "quote") return "gray" as const;
  if (status === "confirmed") return "blue" as const;
  return "orange" as const;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    setJobs(getJobs());
  }, []);

  function confirm(jobId: string) {
    updateJobStatus(jobId, "confirmed", "계약 확정");
    setJobs(getJobs());
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">작업 목록</h1>
          <p className="text-sm text-slate-500">견적부터 완료까지</p>
        </div>
        <Link href="/dashboard/quotes/new">
          <Button>+ 새 견적</Button>
        </Link>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">
                    #{shortId(job.id)}
                  </span>
                  <h3 className="text-lg font-bold">{job.customerName}</h3>
                  <Badge tone={statusTone(job.status)}>
                    {STATUS_LABEL[job.status]}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">
                  {formatDateKR(job.moveDate)} · {job.customerPhone}
                </p>
                <p className="text-sm text-slate-500">
                  {job.from.line} → {job.to.line}
                </p>
                <p className="text-xl font-bold text-orange-600">
                  {formatKRW(job.total)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/q/${job.id}`}>
                  <Button variant="ghost">견적 링크</Button>
                </Link>
                <Link href={`/track/${job.id}`}>
                  <Button variant="ghost">고객 안내</Button>
                </Link>
                {job.status === "quote" && (
                  <Button onClick={() => confirm(job.id)}>계약 확정</Button>
                )}
                {job.status === "confirmed" && (
                  <Link href="/dashboard/dispatch">
                    <Button>배차하기</Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        ))}
        {jobs.length === 0 && (
          <Card className="text-center text-slate-500">
            작업이 없습니다
          </Card>
        )}
      </div>
    </div>
  );
}
