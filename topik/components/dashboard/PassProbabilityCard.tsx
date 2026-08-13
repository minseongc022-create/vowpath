"use client";

import { useState } from "react";
import type { PassProbabilityReport } from "@/topik/types";
import { vi } from "@/topik/lib/i18n/vi";

type Props = {
  report: PassProbabilityReport;
  onSetExamDate?: (date: string) => void;
};

export function PassProbabilityCard({ report, onSetExamDate }: Props) {
  const [examDate, setExamDate] = useState("");

  return (
    <section className="topik-card mb-6 overflow-hidden">
      <div className="bg-gradient-to-br from-learn-primary to-learn-primary-hover p-5 text-white">
        <p className="text-xs font-bold uppercase opacity-90">{vi.home.passProbability}</p>
        <div className="mt-2 flex items-end gap-3">
          <p className="text-4xl font-black">{report.probability}%</p>
          <p className="pb-1 text-sm opacity-90">TOPIK {report.level}</p>
        </div>
        <p className="mt-1 text-xs opacity-80">{vi.home.passProbabilityHint}</p>
        {report.daysToExam !== null && (
          <p className="mt-2 text-sm font-semibold">
            {vi.home.daysToExam} {report.daysToExam} {vi.home.examDays}
          </p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {onSetExamDate && (
          <div className="flex gap-2">
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="flex-1 rounded-xl border border-learn-border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!examDate}
              onClick={() => examDate && onSetExamDate(examDate)}
              className="rounded-xl bg-learn-accent px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              {vi.home.setExamDate}
            </button>
          </div>
        )}

        {report.strengthsVi.length > 0 && (
          <div>
            <p className="text-xs font-bold text-learn-ink-muted mb-1">{vi.home.strengths}</p>
            <ul className="space-y-1">
              {report.strengthsVi.map((s) => (
                <li key={s} className="text-xs text-green-700">✓ {s}</li>
              ))}
            </ul>
          </div>
        )}

        {report.gapsVi.length > 0 && (
          <div>
            <p className="text-xs font-bold text-learn-ink-muted mb-1">{vi.home.gaps}</p>
            <ul className="space-y-1">
              {report.gapsVi.slice(0, 4).map((g) => (
                <li key={g} className="text-xs text-orange-700">→ {g}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
