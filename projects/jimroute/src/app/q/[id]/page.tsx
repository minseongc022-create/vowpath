"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { formatDateKR, formatKRW } from "@/lib/format";
import { MOVE_TYPE_OPTIONS, STATUS_LABEL } from "@/lib/quote-calculator";
import { getCompany, getJob, updateJobStatus } from "@/lib/store";
import type { Job } from "@/lib/types";

export default function PublicQuotePage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const company = getCompany();

  useEffect(() => {
    const found = getJob(id);
    setJob(found ?? null);
  }, [id]);

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card>견적을 찾을 수 없습니다.</Card>
      </div>
    );
  }

  const moveLabel =
    MOVE_TYPE_OPTIONS.find((o) => o.value === job.moveType)?.label ?? "";

  function handleConfirm() {
    updateJobStatus(job!.id, "confirmed", "고객이 견적 승인");
    setJob(getJob(job!.id) ?? null);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    alert("견적 링크가 복사되었습니다. 카카오톡에 붙여넣으세요.");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="mx-auto max-w-lg space-y-4 py-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-orange-600">{company.name}</p>
          <h1 className="mt-1 text-2xl font-black">이사 견적서</h1>
          <p className="text-sm text-slate-500">{job.customerName} 고객님</p>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <Badge tone={job.status === "quote" ? "gray" : "green"}>
              {STATUS_LABEL[job.status]}
            </Badge>
            <p className="text-sm text-slate-500">
              {formatDateKR(job.moveDate)}
            </p>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <p>
              <span className="text-slate-500">이사 종류</span> · {moveLabel} (
              {job.pyung}평)
            </p>
            <p>
              <span className="text-slate-500">출발</span> · {job.from.line}
            </p>
            <p>
              <span className="text-slate-500">도착</span> · {job.to.line}
            </p>
          </div>

          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            {job.lineItems.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span className="text-slate-600">{item.label}</span>
                <span>{formatKRW(item.amount)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span>총 견적</span>
              <span className="text-orange-600">{formatKRW(job.total)}</span>
            </div>
            <p className="mt-1 text-right text-sm text-slate-500">
              계약금 {formatKRW(job.deposit)}
            </p>
          </div>
        </Card>

        {job.notes && (
          <Card>
            <p className="text-sm text-slate-500">특이사항</p>
            <p className="mt-1">{job.notes}</p>
          </Card>
        )}

        <div className="space-y-2">
          {job.status === "quote" && (
            <Button className="w-full" onClick={handleConfirm}>
              견적 승인 (계약 확정)
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={copyLink}>
            카카오톡으로 공유 (링크 복사)
          </Button>
          <Link href={`/track/${job.id}`} className="block">
            <Button variant="secondary" className="w-full">
              이사 진행상황 보기
            </Button>
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400">
          문의: {company.phone}
        </p>
      </div>
    </div>
  );
}
