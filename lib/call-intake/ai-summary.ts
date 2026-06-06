import type { IntakeDraft } from "./types";
import type { JobPriority } from "../types";

export function generateAiSummary(
  draft: IntakeDraft,
  priority: JobPriority,
  cityHint?: string,
): string {
  const lines: string[] = [];

  const issue = draft.issueType.trim();
  if (issue && issue.toLowerCase() !== "unknown") {
    lines.push(`Customer reports ${issue}.`);
  } else if (draft.symptom) {
    lines.push(`Customer reports ${draft.symptom.toLowerCase()}.`);
  }

  if (priority === "P1") {
    lines.push("Emergency priority — requires shop review before dispatch.");
  } else if (priority === "P2") {
    lines.push("Same-day service preference noted — not confirmed until approved.");
  }

  if (cityHint && cityHint !== "—") {
    lines.push(`Located in ${cityHint}.`);
  } else if (draft.address && !draft.address.toLowerCase().includes("unknown")) {
    const parts = draft.address.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      lines.push(`Located in ${parts.slice(-2).join(", ")}.`);
    }
  }

  if (
    draft.arrivalWindow &&
    !draft.arrivalWindow.toLowerCase().includes("pending shop review")
  ) {
    lines.push(`Caller preference: ${draft.arrivalWindow} (pending review).`);
  }

  return lines.length > 0
    ? lines.join("\n")
    : "Service request captured. Shop must approve before confirming.";
}
