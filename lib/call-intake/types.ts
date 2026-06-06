import type { SlotOffer } from "../booking-settings";
import type { JobPriority } from "../types";
import type { PrioritySource, ServicePriority } from "../service-priority";

export const MANDATORY_VERIFY_FIELDS = [
  "customerName",
  "address",
  "serviceLocation",
  "issueType",
] as const;

export type MandatoryVerifyField = (typeof MANDATORY_VERIFY_FIELDS)[number];

export type IntakeChannel = "phone" | "sms_link";

export type IntakePhase =
  | "collect"
  | "verify"
  | "repeat"
  | "address_retry"
  | "slot_pick"
  | "final"
  | "committed";

export type IntakeDraft = {
  customerName: string;
  address: string;
  serviceLocation: string;
  issueType: string;
  symptom: string;
  priority: JobPriority;
  servicePriority: ServicePriority;
  priorityReasons: string[];
  prioritySource: PrioritySource;
  arrivalWindow: string;
  dispatchNotes: string;
  jobberPasteBlock: string;
};

export type FieldConfidence = Record<MandatoryVerifyField, number>;

/** Persisted on call log after intake */
export type StoredAddressValidation = {
  valid: boolean;
  formattedAddress?: string;
  provider: string;
};

export type StoredVerifiedFields = Partial<Record<MandatoryVerifyField, boolean>>;

export type CallIntakeState = {
  callSid: string;
  userId: string;
  from: string;
  to: string;
  menuPriority: JobPriority | null;
  phase: IntakePhase;
  /** Field being verified or re-collected */
  activeField?: MandatoryVerifyField;
  rawTranscript: string;
  draft: IntakeDraft;
  confidence: FieldConfidence;
  verified: Partial<Record<MandatoryVerifyField, boolean>>;
  addressValidation?: {
    valid: boolean;
    formattedAddress?: string;
    provider: string;
  };
  callbackPhone: string;
  recordingUrl?: string;
  recordingSid?: string;
  attempt: number;
  offeredSlots?: SlotOffer[];
  selectedSlot?: SlotOffer | null;
  createdAt: string;
  updatedAt: string;
};

export type VerifiedCallPayload = {
  transcript: string;
  customerName: string;
  address: string;
  serviceLocation: string;
  issueType: string;
  symptom: string;
  priority: JobPriority;
  servicePriority: ServicePriority;
  priorityReasons: string[];
  prioritySource: PrioritySource;
  priorityOverriddenAt?: string;
  arrivalWindow: string;
  dispatchNotes: string;
  jobberPasteBlock: string;
  callbackPhone: string;
  aiSummary: string;
  callSid: string;
  to: string;
  recordingUrl?: string;
  confidence: FieldConfidence;
  verificationComplete: true;
  addressValidation?: CallIntakeState["addressValidation"];
  verifiedFields?: Partial<Record<MandatoryVerifyField, boolean>>;
  intakePhotoRef?: string;
};
