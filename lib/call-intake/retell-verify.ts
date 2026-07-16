import { validateServiceAddress } from "./address-validation";
import { isHighConfidenceIntake, needsConfidenceReask } from "./confidence-config";
import type {
  FieldConfidence,
  IntakeDraft,
  MandatoryVerifyField,
  VerifiedCallPayload,
} from "./types";
import { MANDATORY_VERIFY_FIELDS } from "./types";

export function buildVerifiedFieldsFromConfidence(
  confidence: FieldConfidence,
): Partial<Record<MandatoryVerifyField, boolean>> {
  const out: Partial<Record<MandatoryVerifyField, boolean>> = {};
  for (const field of MANDATORY_VERIFY_FIELDS) {
    out[field] = !needsConfidenceReask(confidence[field], field);
  }
  return out;
}

export type RetellIntakeEnrichment = {
  payload: VerifiedCallPayload;
  verificationComplete: boolean;
};

/** Align Retell tool submissions with Twilio intake verification standards. */
export async function enrichRetellIntakeForFinalize(params: {
  draft: IntakeDraft;
  confidence: FieldConfidence;
  transcriptSource: string;
  callSid: string;
  to: string;
  from: string;
  aiSummary: string;
}): Promise<RetellIntakeEnrichment> {
  let address = params.draft.address;
  let addressValidation: VerifiedCallPayload["addressValidation"];

  if (address?.trim() && address.toLowerCase() !== "unknown") {
    const check = await validateServiceAddress(address);
    addressValidation = {
      valid: check.valid,
      formattedAddress: check.formattedAddress,
      provider: check.provider,
    };
    if (check.valid && check.formattedAddress) {
      address = check.formattedAddress;
    }
  }

  const verifiedFields = buildVerifiedFieldsFromConfidence(params.confidence);
  const addressOk = addressValidation?.valid !== false;
  const verificationComplete = isHighConfidenceIntake(params.confidence) && addressOk;

  const payload: VerifiedCallPayload = {
    transcript: params.transcriptSource,
    customerName: params.draft.customerName,
    address,
    serviceLocation: params.draft.serviceLocation,
    issueType: params.draft.issueType,
    symptom: params.draft.symptom,
    priority: params.draft.priority,
    servicePriority: params.draft.servicePriority,
    priorityReasons: params.draft.priorityReasons,
    prioritySource: params.draft.prioritySource,
    arrivalWindow: params.draft.arrivalWindow,
    dispatchNotes: params.draft.dispatchNotes,
    jobberPasteBlock: params.draft.jobberPasteBlock,
    callbackPhone: params.from || "Unknown",
    aiSummary: params.aiSummary,
    callSid: params.callSid,
    to: params.to,
    confidence: params.confidence,
    verificationComplete,
    addressValidation,
    verifiedFields,
    lossCategory: params.draft.lossCategory,
    insuranceCarrier: params.draft.insuranceCarrier,
    insuranceClaimNumber: params.draft.insuranceClaimNumber,
    waterSource: params.draft.waterSource,
    activeLoss: params.draft.activeLoss,
    severity: params.draft.severity,
    lastServiceYear: params.draft.lastServiceYear,
    urgency: params.draft.urgency,
  };

  return { payload, verificationComplete };
}
