import type { ForwardingProviderId } from "./forwarding-guides-en";

/** Q1 — where customer calls today */
export type QuizCustomerLine = "shop_cell" | "business_voip" | "google_voice" | "unsure";

/** Q2a — mobile carrier */
export type QuizCellCarrier = "att" | "tmobile" | "verizon" | "xfinity";

/** Q2b — business VoIP */
export type QuizVoipSystem = "dialpad" | "ringcentral" | "grasshopper";

/** Q3 — overflow vs Effiroad-as-main-line */
export type QuizSetupGoal = "overflow" | "effiroad_main";

export type ForwardingQuizAnswers = {
  customerLine: QuizCustomerLine | null;
  cellCarrier: QuizCellCarrier | null;
  voipSystem: QuizVoipSystem | null;
  setupGoal: QuizSetupGoal | null;
};

export function quizNeedsSecondQuestion(line: QuizCustomerLine | null): boolean {
  return line === "shop_cell" || line === "business_voip";
}

export function quizNeedsThirdQuestion(line: QuizCustomerLine | null): boolean {
  return line !== null && line !== "unsure";
}

export function resolveQuizProvider(answers: ForwardingQuizAnswers): ForwardingProviderId | null {
  const { customerLine, cellCarrier, voipSystem, setupGoal } = answers;
  if (!customerLine) return null;
  if (customerLine === "unsure" || setupGoal === "effiroad_main") return "effiroad_main";
  if (customerLine === "google_voice") return "google_voice";
  if (customerLine === "shop_cell") return cellCarrier ?? null;
  return voipSystem ?? null;
}

export function isQuizComplete(answers: ForwardingQuizAnswers): boolean {
  if (!answers.customerLine) return false;
  if (answers.customerLine === "unsure") return true;
  if (answers.customerLine === "shop_cell" && !answers.cellCarrier) return false;
  if (answers.customerLine === "business_voip" && !answers.voipSystem) return false;
  return answers.setupGoal !== null;
}

export function googleVoiceOverflowRisk(answers: ForwardingQuizAnswers): boolean {
  return (
    answers.customerLine === "google_voice" &&
    answers.setupGoal === "overflow"
  );
}
