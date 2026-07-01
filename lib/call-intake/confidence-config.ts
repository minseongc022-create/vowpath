import { MANDATORY_VERIFY_FIELDS } from "./types";
import type { FieldConfidence, MandatoryVerifyField } from "./types";

/**
 * Default minimum confidence (0–100) per field before auto re-ask. Address stays strict
 * — a wrong address sends the crew to the wrong house. Name and issue tolerate more
 * since they're either low-stakes or easy to correct later in the call.
 */
const DEFAULT_FIELD_THRESHOLDS: Record<MandatoryVerifyField, number> = {
  address: 85,
  customerName: 70,
  serviceLocation: 75,
  issueType: 65,
};

const ENV_KEYS: Record<MandatoryVerifyField, string> = {
  customerName: "CALL_INTAKE_CONFIDENCE_THRESHOLD_NAME",
  address: "CALL_INTAKE_CONFIDENCE_THRESHOLD_ADDRESS",
  serviceLocation: "CALL_INTAKE_CONFIDENCE_THRESHOLD_SERVICE_LOCATION",
  issueType: "CALL_INTAKE_CONFIDENCE_THRESHOLD_ISSUE_TYPE",
};

/** Minimum confidence (0–100) before auto re-ask for a given field. */
export function getConfidenceThreshold(field: MandatoryVerifyField): number {
  const raw = process.env[ENV_KEYS[field]]?.trim();
  const n = raw ? Number(raw) : DEFAULT_FIELD_THRESHOLDS[field];
  if (!Number.isFinite(n)) return DEFAULT_FIELD_THRESHOLDS[field];
  return Math.min(100, Math.max(50, Math.round(n)));
}

export function needsConfidenceReask(score: number, field: MandatoryVerifyField): boolean {
  return score < getConfidenceThreshold(field);
}

export function isHighConfidenceIntake(confidence: FieldConfidence): boolean {
  return MANDATORY_VERIFY_FIELDS.every((f) => !needsConfidenceReask(confidence[f], f));
}

/** Post-intake customer SMS when any mandatory field was below threshold. */
export function needsCustomerConfirmationSms(confidence: FieldConfidence): boolean {
  return !isHighConfidenceIntake(confidence);
}

export { shouldSendCustomerVerificationSms } from "../customer-verification/triggers";