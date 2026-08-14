import type { SessionStats } from "@/topik/lib/quiz/check-answer";

export async function postSessionComplete(
  action: "complete-practice" | "complete-drill" | "complete-mock",
  sectionStats: SessionStats["bySection"],
): Promise<void> {
  await fetch("/topik/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, sectionStats }),
  });
}
