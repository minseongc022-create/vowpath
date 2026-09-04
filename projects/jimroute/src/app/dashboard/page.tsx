"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, StatCard } from "@/components/ui";
import { formatDateKR, formatKRW } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/quote-calculator";
import { getCompany, getJobs, seedDemoJobs } from "@/lib/store";
import type { Job } from "@/lib/types";

function statusTone(status: Job["status"]) {
  if (status === "done") return "green" as const;
  if (status === "cancelled") return "red" as const;
  if (status === "quote") return "gray" as const;
  if (status === "confirmed") return "blue" as const;
  return "orange" as const;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const company = getCompany();

  useEffect(() => {
    seedDemoJobs();
    setJobs(getJobs());
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayJobs = jobs.filter((j) => j.moveDate === today);
  const pendingQuotes = jobs.filter((j) => j.status === "quote");
  const monthRevenue = jobs
    .filter((j) => j.status === "done")
    .reduce((s, j) => s + j.total, 0);

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold">{company.name} 대시보드</h1>
        <p className="text-sm text-slate-500">오늘의 이사 현황을 한눈에</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="오늘 이사" value={`${todayJobs.length}건`} />
        <StatCard label="견적 대기" value={`${pendingQuotes.length}건`} />
        <StatCard
          label="완료 매출 (누적)"
          value={formatKRW(monthRevenue)}
          hint="데모 데이터 기준"
        />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">최근 작업</h2>
          <Link href="/dashboard/jobs" className="text-sm text-orange-600">
            전체 보기 →
          </Link>
        </div>
        {jobs.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            아직 작업이 없어요.{" "}
            <Link href="/dashboard/quotes/new" className="text-orange-600">
              첫 견적 만들기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{job.customerName}</p>
                    <Badge tone={statusTone(job.status)}>
                      {STATUS_LABEL[job.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatDateKR(job.moveDate)} · {job.from.line}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatKRW(job.total)}</p>
                  <Link
                    href={`/track/${job.id}`}
                    className="text-xs text-orange-600"
                  >
                    고객 안내 링크
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
