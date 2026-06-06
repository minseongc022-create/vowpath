import { MANDATORY_VERIFY_FIELDS } from "./types";
import type { FieldConfidence } from "./types";

/** Minimum confidence (0–100) before auto re-ask for a field. */
export function getConfidenceThreshold(): number {
  const raw = process.env.CALL_INTAKE_CONFIDENCE_THRESHOLD?.trim();
  const n = raw ? Number(raw) : 85;
  if (!Number.isFinite(n)) return 85;
  return Math.min(100, Math.max(50, Math.round(n)));
}

export function needsConfidenceReask(score: number): boolean {
  return score < getConfidenceThreshold();
}

export function isHighConfidenceIntake(confidence: FieldConfidence): boolean {
  return MANDATORY_VERIFY_FIELDS.every((f) => !needsConfidenceReask(confidence[f]));
}

/** Post-intake customer SMS when any mandatory field was below threshold. */
export function needsCustomerConfirmationSms(confidence: FieldConfidence): boolean {
  return !isHighConfidenceIntake(confidence);
}

export { shouldSendCustomerVerificationSms } from "../customer-verification/triggers";