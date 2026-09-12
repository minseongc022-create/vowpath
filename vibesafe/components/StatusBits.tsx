import type { AppHealth } from "../lib/dashboard";

export function StatusDot({ health }: { health: AppHealth }) {
  const state = health === "checking" ? "running" : health;
  return <span className="vs-status-dot" data-state={state} aria-hidden="true" />;
}

const TONE: Record<string, string> = {
  passed: "ok",
  failed: "down",
  skipped: "neutral",
  queued: "info",
  running: "info",
  cancelled: "neutral",
};

const LABEL: Record<string, string> = {
  passed: "정상",
  failed: "실패",
  skipped: "건너뜀",
  queued: "대기 중",
  running: "확인 중",
  cancelled: "취소됨",
};

export function ResultBadge({ status }: { status: string | null }) {
  if (!status) return <span className="vs-badge" data-tone="neutral">확인 전</span>;
  return (
    <span className="vs-badge" data-tone={TONE[status] ?? "neutral"}>
      {LABEL[status] ?? status}
    </span>
  );
}

export function RiskBadge({ level }: { level: string }) {
  if (level === "blocked") {
    return <span className="vs-badge" data-tone="down">실행 제외</span>;
  }
  if (level === "caution") {
    return <span className="vs-badge" data-tone="warn">확인 필요</span>;
  }
  return null;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const tone = severity === "high" ? "down" : severity === "medium" ? "warn" : "neutral";
  const label = severity === "high" ? "높음" : severity === "medium" ? "보통" : "낮음";
  return <span className="vs-badge" data-tone={tone}>{label}</span>;
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="vs-empty">
      <p className="vs-empty-title">{title}</p>
      {children}
    </div>
  );
}
