"use client";

import { useState } from "react";
import type { PassProbabilityReport } from "@/topik/types";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";

type Props = {
  report: PassProbabilityReport;
  onSetExamDate?: (date: string) => void;
};

export function PassProbabilityCard({ report, onSetExamDate }: Props) {
  const vi = useTopikVi();

  const [examDate, setExamDate] = useState("");

  return (
    <section className="topik-card-soft mb-5 overflow-hidden topik-animate-in">
      <div className="relative bg-gradient-to-br from-learn-primary via-[#d97070] to-[#e8a855] p-5 text-white">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" aria-hidden />
        <p className="text-xs font-semibold opacity-90">{vi.home.passProbability}</p>
        <div className="mt-2 flex items-end gap-2">
          <p className="text-4xl font-bold tracking-tight">{report.probability}%</p>
          <p className="pb-1 text-sm font-medium opacity-90">TOPIK {report.level}</p>
        </div>
        <div className="topik-progress-bar mt-3 bg-white/20">
          <div className="topik-progress-fill bg-white/90" style={{ width: `${report.probability}%` }} />
        </div>
        <p className="mt-2 text-xs opacity-80 leading-relaxed">{vi.home.passProbabilityHint}</p>
        {report.daysToExam !== null && (
          <p className="mt-2 text-sm font-semibold">
            {vi.home.daysToExam} {report.daysToExam} {vi.home.examDays}
          </p>
        )}
      </div>

      <div className="space-y-4 p-4">
        {onSetExamDate && (
          <div className="flex gap-2">
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="topik-input flex-1 !py-2.5 text-sm"
            />
            <button
              type="button"
              disabled={!examDate}
              onClick={() => examDate && onSetExamDate(examDate)}
              className="topik-btn topik-btn-accent topik-btn-sm shrink-0"
            >
              {vi.home.setExamDate}
            </button>
          </div>
        )}

        {report.strengthsVi.length > 0 && (
          <div>
            <p className="topik-section-title mb-2">{vi.home.strengths}</p>
            <ul className="space-y-1.5">
              {report.strengthsVi.map((s) => (
                <li key={s} className="flex gap-2 text-xs text-learn-accent">
                  <span className="shrink-0">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.gapsVi.length > 0 && (
          <div>
            <p className="topik-section-title mb-2">{vi.home.gaps}</p>
            <ul className="space-y-1.5">
              {(report.gapLinks?.length ? report.gapLinks : report.gapsVi.slice(0, 4).map((g) => ({ text: g, href: "" }))).slice(0, 4).map((g) => (
                <li key={g.text} className="flex gap-2 text-xs text-[var(--topik-coral)]">
                  <span className="shrink-0">→</span>
                  {g.href ? (
                    <a href={g.href} className="underline-offset-2 hover:underline">
                      {g.text}
                    </a>
                  ) : (
                    <span>{g.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
