import {
  formatPriorityWithCode,
  priorityBadgeClass,
  priorityDisplayLabel,
  normalizeJobPriority,
} from "@/lib/priority-display";
import type { JobPriority } from "@/lib/types";

type PriorityBadgeProps = {
  priority: JobPriority | undefined | null;
  /** Show "P2 · Normal" instead of "Normal" only */
  showCode?: boolean;
  theme?: "light" | "dark";
  className?: string;
};

export function PriorityBadge({
  priority,
  showCode = false,
  theme = "dark",
  className = "",
}: PriorityBadgeProps) {
  const p = normalizeJobPriority(priority);
  const text = showCode ? formatPriorityWithCode(p) : priorityDisplayLabel(p);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${priorityBadgeClass(p, theme)} ${className}`}
    >
      {text}
    </span>
  );
}
