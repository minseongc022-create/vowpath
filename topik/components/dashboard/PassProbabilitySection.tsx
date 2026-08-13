"use client";

import { useRouter } from "next/navigation";
import { PassProbabilityCard } from "@/topik/components/dashboard/PassProbabilityCard";
import type { PassProbabilityReport } from "@/topik/types";

type Props = {
  report: PassProbabilityReport;
};

export function PassProbabilitySection({ report }: Props) {
  const router = useRouter();

  async function handleSetExamDate(date: string) {
    await fetch("/topik/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set-exam-date", examDate: date }),
    });
    router.refresh();
  }

  return <PassProbabilityCard report={report} onSetExamDate={handleSetExamDate} />;
}
