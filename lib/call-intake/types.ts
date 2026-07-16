import type { SlotOffer } from "../booking-settings";
import type { JobPriority } from "../types";
import type { PrioritySource, ServicePriority } from "../service-priority";
import type { LossCategory } from "../loss-category";
import type { ShopVertical } from "../shop-vertical.js";

export const MANDATORY_VERIFY_FIELDS = [
  "customerName",
  "address",
  "serviceLocation",
  "issueType",
] as const;

export type MandatoryVerifyField = (typeof MANDATORY_VERIFY_FIELDS)[number];

export type IntakeChannel = "phone" | "sms_link" | "webchat";

export type IntakePhase =
  | "returning_customer"
  | "collect"
  | "verify"
  | "repeat"
  | "address_retry"
  | "optional_collect"
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
  lossCategory: LossCategory;
  insuranceCarrier?: string;
  insuranceClaimNumber?: string;
  waterSource?: string;
  activeLoss?: boolean;
  /** Restoration: caller's self-reported damage severity ("Minor" | "Moderate" | "Severe"). */
  severity?: string;
  /** HVAC: rough year of last service, or a note that this is a first-time customer. */
  lastServiceYear?: string;
  /** HVAC: how soon the caller wants service ("Today" | "This week" | "Flexible"). */
  urgency?: string;
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
  vertical: ShopVertical;
  phase: IntakePhase;
  /** Field being verified or re-collected */
  activeField?: MandatoryVerifyField;
  /** Key of the optionalIntakeFields entry currently being asked in "optional_collect" */
  activeOptionalField?: string;
  /** Candidate match from a past call by this caller ID, pending yes/no confirmation */
  returningCustomerMatch?: {
    customerName: string;
    address: string;
    serviceLocation: string;
  } | null;
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
  /** Failed speech / verification attempts — triggers SMS link fallback */
  phoneIntakeStrikes?: number;
  offeredSlots?: SlotOffer[];
  selectedSlot?: SlotOffer | null;
  /** Outside configured answer hours — follow up next business day */
  afterHours?: boolean;
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
  verificationComplete: boolean;
  addressValidation?: CallIntakeState["addressValidation"];
  verifiedFields?: Partial<Record<MandatoryVerifyField, boolean>>;
  intakePhotoRef?: string;
  lossCategory: LossCategory;
  insuranceCarrier?: string;
  insuranceClaimNumber?: string;
  waterSource?: string;
  activeLoss?: boolean;
  severity?: string;
  lastServiceYear?: string;
  urgency?: string;
  customerSmsConsent?: import("../legal-consent").CustomerSmsConsentRecord;
};
