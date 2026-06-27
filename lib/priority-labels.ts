import {
  formatPriorityWithCode,
  priorityDisplayLabel,
  PRIORITY_DISPLAY_LABEL,
} from "./priority-display";
import type { JobPriority } from "./types";

export const PRIORITY_LABELS = PRIORITY_DISPLAY_LABEL;

export const PRIORITY_LEGEND = "P1 Breakdown · P2 Repair · P3 Service";

export function formatPriority(priority: JobPriority | undefined | null): string {
  if (priority == null) return "—";
  return formatPriorityWithCode(priority);
}

export function formatPriorityShort(priority: JobPriority | undefined | null): string {
  if (priority == null) return "—";
  return priorityDisplayLabel(priority);
}
