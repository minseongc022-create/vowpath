"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { formatDateKR, formatKRW } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/quote-calculator";
import { assignCrew, getCrews, getJobs } from "@/lib/store";
import type { Crew, Job } from "@/lib/types";

export default function DispatchPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);

  useEffect(() => {
    setCrews(getCrews());
    setJobs(
      getJobs().filter(
        (j) => j.status === "confirmed" || j.status === "dispatched",
      ),
    );
  }, []);

  function handleAssign(jobId: string, crewId: string) {
    assignCrew(jobId, crewId);
    setJobs(
      getJobs().filter(
        (j) => j.status === "confirmed" || j.status === "dispatched",
      ),
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold">배차 보드</h1>
        <p className="text-sm text-slate-500">
          계약 확정된 작업에 팀을 배정하세요
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {crews.map((crew) => (
          <Card key={crew.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">{crew.name}</p>
                <p className="text-sm text-slate-500">
                  {crew.truckSize} · {crew.memberCount}명 · {crew.leaderPhone}
                </p>
              </div>
              <Badge tone={crew.active ? "green" : "gray"}>
                {crew.active ? "가용" : "휴무"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {jobs.map((job) => {
          const assigned = crews.find((c) => c.id === job.crewId);
          return (
            <Card key={job.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{job.customerName}</p>
                    <Badge tone={job.status === "dispatched" ? "green" : "blue"}>
                      {STATUS_LABEL[job.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatDateKR(job.moveDate)} · {formatKRW(job.total)}
                  </p>
                  <p className="text-sm text-slate-600">{job.from.line}</p>
                  {assigned && (
                    <p className="mt-1 text-sm font-medium text-orange-600">
                      배정: {assigned.name}
                    </p>
                  )}
                </div>
                {job.status === "confirmed" && (
                  <div className="flex flex-wrap gap-2">
                    {crews
                      .filter((c) => c.active)
                      .map((crew) => (
                        <Button
                          key={crew.id}
                          variant="secondary"
                          onClick={() => handleAssign(job.id, crew.id)}
                        >
                          {crew.name} 배정
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {jobs.length === 0 && (
          <Card className="text-center text-slate-500">
            배차할 작업이 없습니다. 작업 목록에서 계약을 확정하세요.
          </Card>
        )}
      </div>
    </div>
  );
}
