import type { AnalysisSection } from "@/learn/types/material";

type KeySummaryPanelProps = {
  summary?: string;
  sections: AnalysisSection[];
  keywords?: string[];
  compact?: boolean;
};

export function KeySummaryPanel({
  summary,
  sections,
  keywords,
  compact = false,
}: KeySummaryPanelProps) {
  const totalPoints = sections.reduce((n, s) => n + s.points.length, 0);

  if (sections.length === 0) {
    return (
      <p className="p-4 text-sm text-learn-ink-muted text-center">
        AI 분석 중이거나 아직 자료가 연결되지 않았습니다.
      </p>
    );
  }

  return (
    <div className={`learn-scroll overflow-y-auto ${compact ? "p-3" : "p-4"} space-y-4`}>
      {summary && (
        <p className="text-sm font-medium text-learn-ink leading-snug">{summary}</p>
      )}
      <p className="text-[11px] font-semibold text-learn-ink-subtle">
        총 {totalPoints}개 핵심 항목
      </p>

      {sections.map((sec) => (
        <div key={sec.title} className="rounded-xl border border-learn-border bg-learn-surface p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-learn-primary">
            {sec.title}
          </h3>
          <ul className="space-y-1.5">
            {sec.points.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-learn-ink leading-snug">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-learn-primary/60" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {keywords && keywords.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full bg-learn-muted px-2.5 py-0.5 text-[10px] font-medium text-learn-ink-muted"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
