import { ADDRESS_VERIFY_FAIL_PROMPT, validateServiceAddress } from "./address-validation";
import {
  isHighConfidenceIntake,
  needsConfidenceReask,
} from "./confidence-config";
import { formatCallbackForSpeech } from "./caller-id";
import { extractIntakeFromSpeechForVertical } from "./extraction";
import type {
  CallIntakeState,
  MandatoryVerifyField,
  VerifiedCallPayload,
} from "./types";
import { MANDATORY_VERIFY_FIELDS } from "./types";
import { generateAiSummary } from "./ai-summary";
import { parseUsAddress } from "../parse-contact";
import type { ShopVertical } from "../shop-vertical.js";
import { getVerticalConfig } from "../vertical-config.js";

export function fieldVerifyPrompt(
  field: MandatoryVerifyField,
  value: string,
  vertical: ShopVertical,
): string {
  switch (field) {
    case "customerName":
      return `I heard ${value} — did I get that right? Press 1 for yes, or press 2 if you'd like to say it again.`;
    case "address":
      return `I have the address as ${value} — does that sound right? Press 1 for yes, or press 2 if I should try again.`;
    case "serviceLocation":
      return `So the service would be at ${value} — is that the right spot? Press 1 for yes, or press 2 for no.`;
    case "issueType":
      return `It sounds like the issue is ${value} — did I get that right? Press 1 for yes, or press 2 if I missed something.`;
  }
}

export function fieldRepeatPrompt(
  field: MandatoryVerifyField,
  vertical: ShopVertical,
): string {
  switch (field) {
    case "customerName":
      return "No problem at all — could you say your first and last name again, nice and clear? I'm listening.";
    case "address":
      return ADDRESS_VERIFY_FAIL_PROMPT;
    case "serviceLocation":
      return "Sure thing — what's the full address where you need us? Street, city, and state, whenever you're ready.";
    case "issueType":
      if (vertical === "restoration") {
        return "I'm sorry about that — could you describe the damage once more? For example, is it water, fire, or mold?";
      }
      if (vertical === "hvac") {
        return "No problem — could you tell me again what's going on with your heating or cooling? Take your time, no rush.";
      }
      return `I'm sorry about that — could you describe the issue once more? For example: ${getVerticalConfig(
        vertical,
      )
        .issueExamples.slice(0, 3)
        .join(", ")}.`;
  }
}

export function finalConfirmPrompt(state: CallIntakeState): string {
  const phone = formatCallbackForSpeech(state.callbackPhone);
  const windowPart = state.selectedSlot
    ? ` Visit window: ${state.selectedSlot.label}.`
    : "";
  return (
    `Perfect — let me read everything back, just to make sure we've got you completely covered. ` +
    `Name: ${state.draft.customerName}. ` +
    `Address: ${state.draft.address}. ` +
    `Issue: ${state.draft.issueType}.${windowPart} ` +
    `We'll reach you at ${phone}, the number you're calling from. ` +
    `Press 1 if all of that looks good, or press 2 to start over — either way is totally fine.`
  );
}

function nextUnverifiedField(state: CallIntakeState): MandatoryVerifyField | null {
  for (const field of MANDATORY_VERIFY_FIELDS) {
    if (!state.verified[field]) return field;
  }
  return null;
}

function isBlankSlotValue(value: string | undefined, field: MandatoryVerifyField): boolean {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return true;
  if (field === "issueType") return v === "service request";
  return v === "unknown";
}

/**
 * Applies a re-asked field's answer. Re-runs GPT extraction on the answer (instead of
 * assigning it verbatim) so that any extra info the caller volunteers in the same breath
 * — e.g. restating the address while also re-describing the issue — still gets captured
 * into whichever other mandatory fields are still missing, instead of being discarded.
 */
export async function applyFieldValue(
  state: CallIntakeState,
  field: MandatoryVerifyField,
  value: string,
): Promise<CallIntakeState> {
  const trimmed = value.trim();
  if (!trimmed) return state;

  const { draft: extracted, confidence: extractedConfidence } =
    await extractIntakeFromSpeechForVertical(state.vertical, trimmed, state.menuPriority);

  const draft = { ...state.draft };
  const confidence = { ...state.confidence };

  if (field === "customerName") {
    draft.customerName = isBlankSlotValue(extracted.customerName, field)
      ? trimmed
      : extracted.customerName;
  }
  if (field === "address") {
    draft.address = isBlankSlotValue(extracted.address, field) ? trimmed : extracted.address;
  }
  if (field === "serviceLocation") {
    draft.serviceLocation = isBlankSlotValue(extracted.serviceLocation, field)
      ? trimmed
      : extracted.serviceLocation;
  }
  if (field === "issueType") {
    draft.issueType = isBlankSlotValue(extracted.issueType, field) ? trimmed : extracted.issueType;
    draft.symptom = extracted.symptom || trimmed;
  }
  // The caller was directly asked for this field and just answered it — treat it as
  // reliable regardless of the model's self-reported score for this one turn.
  confidence[field] = Math.max(confidence[field] ?? 0, extractedConfidence[field] ?? 0, 90);

  // Bonus capture: any other still-missing mandatory field the caller volunteered
  // unprompted in the same answer.
  for (const other of MANDATORY_VERIFY_FIELDS) {
    if (other === field || state.verified[other]) continue;
    if (!isBlankSlotValue(draft[other], other)) continue;
    const candidate = extracted[other];
    if (isBlankSlotValue(candidate, other)) continue;
    draft[other] = candidate;
    confidence[other] = Math.max(confidence[other] ?? 0, extractedConfidence[other] ?? 0);
  }

  return { ...state, draft, confidence };
}

export async function runExtractionAfterCollect(
  state: CallIntakeState,
  options?: { lowConfidence?: boolean },
): Promise<CallIntakeState> {
  const transcriptForExtraction = options?.lowConfidence
    ? `(low confidence transcript) ${state.rawTranscript}`
    : state.rawTranscript;
  const { draft, confidence } = await extractIntakeFromSpeechForVertical(
    state.vertical,
    transcriptForExtraction,
    state.menuPriority,
  );

  // Preserve fields already confirmed earlier in the call (e.g. a returning-customer
  // match) when this turn's utterance didn't restate them.
  const verified: CallIntakeState["verified"] = {};
  if (state.verified.customerName && isBlankSlotValue(draft.customerName, "customerName")) {
    draft.customerName = state.draft.customerName;
    confidence.customerName = 100;
    verified.customerName = true;
  }
  if (state.verified.address && isBlankSlotValue(draft.address, "address")) {
    draft.address = state.draft.address;
    confidence.address = 100;
    verified.address = true;
    if (isBlankSlotValue(draft.serviceLocation, "serviceLocation")) {
      draft.serviceLocation = state.draft.serviceLocation;
    }
  }
  if (state.verified.serviceLocation && isBlankSlotValue(draft.serviceLocation, "serviceLocation")) {
    draft.serviceLocation = state.draft.serviceLocation;
    confidence.serviceLocation = 100;
    verified.serviceLocation = true;
  }

  let next = {
    ...state,
    draft,
    confidence,
    verified,
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
    return advanceToOptionalCollectOrSlotPick(next);
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

function isOptionalFieldAnswered(
  draft: CallIntakeState["draft"],
  field: ReturnType<typeof getVerticalConfig>["optionalIntakeFields"][number],
): boolean {
  const raw = (draft as unknown as Record<string, unknown>)[field.key];
  if (field.type === "checkbox") return typeof raw === "boolean";
  return typeof raw === "string" && raw.trim().length > 0;
}

function nextUnansweredOptionalField(
  state: CallIntakeState,
): ReturnType<typeof getVerticalConfig>["optionalIntakeFields"][number] | null {
  const fields = getVerticalConfig(state.vertical).optionalIntakeFields.filter(
    (f) => f.askOnCall,
  );
  for (const field of fields) {
    if (!isOptionalFieldAnswered(state.draft, field)) return field;
  }
  return null;
}

/** After all 4 mandatory fields are settled, walk any vertical-specific follow-up
 * questions (severity, equipment type, etc.) before moving on to slot picking. */
export function advanceToOptionalCollectOrSlotPick(state: CallIntakeState): CallIntakeState {
  const next = nextUnansweredOptionalField(state);
  if (next) {
    return {
      ...state,
      phase: "optional_collect",
      activeField: undefined,
      activeOptionalField: next.key,
    };
  }
  return { ...state, phase: "slot_pick", activeField: undefined, activeOptionalField: undefined };
}

/** Applies the caller's answer to the currently active optional field, then advances
 * to the next unanswered optional field (or on to slot picking once they're all done). */
export function applyOptionalFieldAnswer(
  state: CallIntakeState,
  fieldKey: string,
  answer: { digit?: string | null; speech?: string },
): CallIntakeState {
  const config = getVerticalConfig(state.vertical).optionalIntakeFields.find(
    (f) => f.key === fieldKey,
  );
  if (!config) return advanceToOptionalCollectOrSlotPick(state);

  const draft = { ...state.draft } as unknown as Record<string, unknown>;

  if (config.type === "choice" && config.choices) {
    const idx = answer.digit ? Number(answer.digit) : NaN;
    if (Number.isInteger(idx) && idx >= 1 && idx <= config.choices.length) {
      draft[fieldKey] = config.choices[idx - 1];
    }
  } else if (config.type === "checkbox") {
    if (answer.digit === "1") draft[fieldKey] = true;
    else if (answer.digit === "2") draft[fieldKey] = false;
  } else {
    const trimmed = answer.speech?.trim();
    if (trimmed) draft[fieldKey] = trimmed;
  }

  const updated = { ...state, draft: draft as unknown as CallIntakeState["draft"] };
  return advanceToOptionalCollectOrSlotPick(updated);
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
    lossCategory: state.draft.lossCategory ?? "other",
    insuranceCarrier: state.draft.insuranceCarrier,
    insuranceClaimNumber: state.draft.insuranceClaimNumber,
    waterSource: state.draft.waterSource,
    activeLoss: state.draft.activeLoss,
    severity: state.draft.severity,
    lastServiceYear: state.draft.lastServiceYear,
    urgency: state.draft.urgency,
  };
}

export function shouldReaskForConfidence(
  state: CallIntakeState,
  field: MandatoryVerifyField,
): boolean {
  return needsConfidenceReask(state.confidence[field], field);
}
