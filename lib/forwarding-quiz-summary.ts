import type { ForwardingProviderId } from "./forwarding-guides-en";
import type { ForwardingQuizAnswers } from "./forwarding-quiz";

export type QuizPathSummaryCopy = {
  headline: string;
  body: string;
  method: string;
  whatYouNeed: readonly string[];
  timeLabel: string;
};

export function getQuizPathSummary(
  provider: ForwardingProviderId,
  pathSummary: Record<string, QuizPathSummaryCopy>,
): QuizPathSummaryCopy {
  return pathSummary[provider] ?? pathSummary.effiroad_main;
}

/** Human-readable recap of quiz answers for the summary card subtitle */
export function formatQuizAnswerRecap(answers: ForwardingQuizAnswers): string | null {
  const parts: string[] = [];
  if (answers.customerLine === "shop_cell") parts.push("Shop cell");
  else if (answers.customerLine === "business_voip") parts.push("Business phone system");
  else if (answers.customerLine === "google_voice") parts.push("Google Voice");
  else if (answers.customerLine === "unsure") return "Simplest path — Effiroad dedicated number";

  if (answers.cellCarrier) {
    const labels: Record<string, string> = {
      att: "AT&T",
      tmobile: "T-Mobile",
      verizon: "Verizon",
      xfinity: "Xfinity",
    };
    parts.push(labels[answers.cellCarrier] ?? answers.cellCarrier);
  }
  if (answers.voipSystem) {
    const labels: Record<string, string> = {
      dialpad: "Dialpad / Jobber Phone",
      ringcentral: "RingCentral",
      grasshopper: "Grasshopper",
    };
    parts.push(labels[answers.voipSystem] ?? answers.voipSystem);
  }
  if (answers.setupGoal === "effiroad_main") parts.push("Effiroad as main line");
  else if (answers.setupGoal === "overflow") parts.push("Miss-call forwarding");

  return parts.length ? parts.join(" · ") : null;
}
