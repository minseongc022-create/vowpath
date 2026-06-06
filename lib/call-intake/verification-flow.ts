import { ADDRESS_VERIFY_FAIL_PROMPT, validateServiceAddress } from "./address-validation";
import {
  isHighConfidenceIntake,
  needsConfidenceReask,
} from "./confidence-config";
import { formatCallbackForSpeech } from "./caller-id";
import { extractIntakeFromSpeech } from "./extraction";
import type {
  CallIntakeState,
  MandatoryVerifyField,
  VerifiedCallPayload,
} from "./types";
import { MANDATORY_VERIFY_FIELDS } from "./types";
import { generateAiSummary } from "./ai-summary";
import { parseUsAddress } from "../parse-contact";

export function fieldVerifyPrompt(field: MandatoryVerifyField, value: string): string {
  switch (field) {
    case "customerName":
      return `I heard the name ${value}. Is that correct? Press 1 for yes, 2 for no.`;
    case "address":
      return `I heard the address ${value}. Is that correct? Press 1 for yes, 2 for no.`;
    case "serviceLocation":
      return `Service will be performed at ${value}. Is that correct? Press 1 for yes, 2 for no.`;
    case "issueType":
      return `I heard the issue is ${value}. Is that correct? Press 1 for yes, 2 for no.`;
  }
}

export function fieldRepeatPrompt(field: MandatoryVerifyField): string {
  switch (field) {
    case "customerName":
      return "Please say your first and last name clearly.";
    case "address":
      return ADDRESS_VERIFY_FAIL_PROMPT;
    case "serviceLocation":
      return "Please say the full address where service is needed.";
    case "issueType":
      return "Please describe what is wrong with your H V A C system.";
  }
}

export function finalConfirmPrompt(state: CallIntakeState): string {
  const phone = formatCallbackForSpeech(state.callbackPhone);
  const windowPart = state.selectedSlot
    ? ` Visit window: ${state.selectedSlot.label}.`
    : "";
  return (
    `Please confirm your request. ` +
    `Name: ${state.draft.customerName}. ` +
    `Address: ${state.draft.address}. ` +
    `Issue: ${state.draft.issueType}.${windowPart} ` +
    `We will call you back at ${phone}, the number you are calling from. ` +
    `Press 1 to submit your request, or 2 to start over.`
  );
}

function nextUnverifiedField(state: CallIntakeState): MandatoryVerifyField | null {
  for (const field of MANDATORY_VERIFY_FIELDS) {
    if (!state.verified[field]) return field;
  }
  return null;
}

export function applyFieldValue(
  state: CallIntakeState,
  field: MandatoryVerifyField,
  value: string,
): CallIntakeState {
  const trimmed = value.trim();
  if (!trimmed) return state;

  const draft = { ...state.draft };
  if (field === "customerName") draft.customerName = trimmed;
  if (field === "address") draft.address = trimmed;
  if (field === "serviceLocation") draft.serviceLocation = trimmed;
  if (field === "issueType") {
    draft.issueType = trimmed;
    draft.symptom = trimmed;
  }

  return { ...state, draft };
}

export async function runExtractionAfterCollect(
  state: CallIntakeState,
): Promise<CallIntakeState> {
  const { draft, confidence } = await extractIntakeFromSpeech(
    state.rawTranscript,
    state.menuPriority,
  );

  let next = {
    ...state,
    draft,
    confidence,
    verified: {} as CallIntakeState["verified"],
  };

  const addressCheck = await validateServiceAddress(draft.address);
  next.addressValidation = {
    valid: addressCheck.valid,
    formattedAddress: addressCheck.formattedAddress,
    provider: addressCheck.provider,
  };

  if (addressCheck.valid && addressCheck.formattedAddress) {
    next.draft = { ...next.draft, address: addressCheck.formattedAddress };
    if (
      next.draft.serviceLocation.toLowerCase() === "unknown" ||
      next.draft.serviceLocation === draft.address
    ) {
      next.draft.serviceLocation = addressCheck.formattedAddress;
    }
  }

  if (!addressCheck.valid) {
    return {
      ...next,
      phase: "address_retry",
      activeField: "address",
      attempt: 1,
    };
  }

  return advanceToNextVerificationStep(next);
}

export function autoVerifyConfidentFields(state: CallIntakeState): CallIntakeState {
  const verified = { ...state.verified };
  for (const field of MANDATORY_VERIFY_FIELDS) {
    if (!verified[field] && !shouldReaskForConfidence(state, field)) {
      verified[field] = true;
    }
  }
  return { ...state, verified };
}

function advanceToNextVerificationStep(state: CallIntakeState): CallIntakeState {
  const next = autoVerifyConfidentFields(state);
  const first = nextUnverifiedField(next);
  if (!first) {
    return { ...next, phase: "slot_pick", activeField: undefined };
  }

  if (shouldReaskForConfidence(next, first)) {
    return startRepeatForField(next, first);
  }

  return {
    ...next,
    phase: "verify",
    activeField: first,
    attempt: 1,
  };
}

/** Skip DTMF verification when every field is high-confidence and address is valid. */
export function canFastTrackPhoneIntake(state: CallIntakeState): boolean {
  if (state.addressValidation?.valid === false) return false;
  if (!isHighConfidenceIntake(state.confidence)) return false;
  const auto = autoVerifyConfidentFields(state);
  return nextUnverifiedField(auto) === null;
}

export function markFieldVerified(
  state: CallIntakeState,
  field: MandatoryVerifyField,
): CallIntakeState {
  const verified = { ...state.verified, [field]: true };
  const next = { ...state, verified };
  return advanceToNextVerificationStep(next);
}

export function startRepeatForField(
  state: CallIntakeState,
  field: MandatoryVerifyField,
): CallIntakeState {
  return {
    ...state,
    phase: "repeat",
    activeField: field,
    verified: { ...state.verified, [field]: false },
    attempt: (state.attempt ?? 0) + 1,
  };
}

export function buildVerifiedPayload(state: CallIntakeState): VerifiedCallPayload {
  const parsed = parseUsAddress(state.draft.address);
  const cityHint =
    parsed.city && parsed.province
      ? `${parsed.city}, ${parsed.province}`
      : undefined;

  return {
    transcript: state.rawTranscript,
    customerName: state.draft.customerName,
    address: state.draft.address,
    serviceLocation: state.draft.serviceLocation,
    issueType: state.draft.issueType,
    symptom: state.draft.symptom,
    priority: state.draft.priority,
    servicePriority: state.draft.servicePriority,
    priorityReasons: state.draft.priorityReasons,
    prioritySource: state.draft.prioritySource,
    arrivalWindow: state.draft.arrivalWindow,
    dispatchNotes: state.draft.dispatchNotes,
    jobberPasteBlock: state.draft.jobberPasteBlock,
    callbackPhone: state.callbackPhone,
    aiSummary: generateAiSummary(state.draft, state.draft.priority, cityHint),
    callSid: state.callSid,
    to: state.to,
    recordingUrl: state.recordingUrl,
    confidence: state.confidence,
    verificationComplete: true,
    addressValidation: state.addressValidation,
    verifiedFields: state.verified,
  };
}

export function shouldReaskForConfidence(
  state: CallIntakeState,
  field: MandatoryVerifyField,
): boolean {
  return needsConfidenceReask(state.confidence[field]);
}
