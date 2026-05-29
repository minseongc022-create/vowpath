import type { GeneratedJobCard } from "./job-card-ai";
import type { JobPriority } from "./types";

const RANK: Record<JobPriority, number> = { P1: 3, P2: 2, P3: 1 };

/** Menu choice sets a minimum urgency; guardrails may still raise further. */
export function mergeMenuPriority(
  card: GeneratedJobCard,
  menuPriority: JobPriority | null,
): GeneratedJobCard {
  if (!menuPriority) return card;
  if (RANK[card.priority] >= RANK[menuPriority]) return card;
  return { ...card, priority: menuPriority };
}
