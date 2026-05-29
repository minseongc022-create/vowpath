import type { JobPriority } from "./types";

/** 사용자-facing 긴급도 라벨 (내부 값은 P1/P2/P3 유지) */
export const PRIORITY_LABELS: Record<JobPriority, string> = {
  P1: "긴급 (P1)",
  P2: "당일 (P2)",
  P3: "일반 (P3)",
};

export const PRIORITY_LEGEND =
  "긴급(P1) · 당일(P2) · 일반(P3)";

export function formatPriority(
  priority: JobPriority | undefined | null,
): string {
  if (!priority) return "—";
  return PRIORITY_LABELS[priority];
}
