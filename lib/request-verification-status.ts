import { getConfidenceThreshold } from "./call-intake/confidence-config";
import type { MandatoryVerifyField, StoredVerifiedFields } from "./call-intake/types";
import type { CallRecord } from "./operations-analytics";
import { isEnglishUi } from "./locale";

export type VerificationItemState = "verified" | "not_verified" | "failed";

export type RequestVerificationItem = {
  key: "name" | "address" | "phone" | "transcript" | "recording";
  label: string;
  state: VerificationItemState;
  hint?: string;
};

export type RequestVerificationStatus = {
  items: RequestVerificationItem[];
  hasLinkedCall: boolean;
};

const MIN_TRANSCRIPT_CHARS = 8;

function isUnknownValue(value?: string): boolean {
  const t = value?.trim().toLowerCase();
  return !t || t === "unknown" || t === "—";
}

function isValidPhone(raw?: string): boolean {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length >= 10;
}

function meetsConfidence(score: number | undefined, threshold: number): boolean {
  return typeof score === "number" && Number.isFinite(score) && score >= threshold;
}

function resolvePhone(call: CallRecord): string | undefined {
  return call.callbackPhone?.trim() || call.from?.trim() || undefined;
}

function fieldExplicitlyFailed(
  field: MandatoryVerifyField,
  verifiedFields?: StoredVerifiedFields,
): boolean {
  return verifiedFields?.[field] === false;
}

function fieldExplicitlyVerified(
  field: MandatoryVerifyField,
  verifiedFields?: StoredVerifiedFields,
): boolean {
  return verifiedFields?.[field] === true;
}

function resolveFieldVerification(
  field: MandatoryVerifyField,
  value: string | undefined,
  call: CallRecord,
  threshold: number,
): VerificationItemState {
  const confidence = call.confidence;
  const score = confidence?.[field];
  const intakeComplete = call.verificationComplete === true;

  if (!intakeComplete) {
    return "not_verified";
  }

  if (fieldExplicitlyFailed(field, call.verifiedFields)) {
    return "failed";
  }

  const valueBad = isUnknownValue(value);
  const confidenceBad = confidence !== undefined && !meetsConfidence(score, threshold);

  if (field === "address") {
    if (call.addressValidation?.valid === false) {
      return "failed";
    }
    if (valueBad || confidenceBad) {
      return "failed";
    }
    if (fieldExplicitlyVerified(field, call.verifiedFields)) {
      return "verified";
    }
    if (call.addressValidation?.valid === true) {
      return "verified";
    }
    return confidence !== undefined && meetsConfidence(score, threshold) ? "verified" : "failed";
  }

  if (valueBad || confidenceBad) {
    return "failed";
  }

  if (fieldExplicitlyVerified(field, call.verifiedFields)) {
    return "verified";
  }

  if (confidence !== undefined && meetsConfidence(score, threshold)) {
    return "verified";
  }

  return "failed";
}

function resolvePhoneVerification(call: CallRecord): VerificationItemState {
  const phone = resolvePhone(call);
  if (call.verificationComplete !== true) {
    return "not_verified";
  }
  if (!isValidPhone(phone)) {
    return "failed";
  }
  return "verified";
}

function resolveTranscriptAvailability(call: CallRecord | undefined): VerificationItemState {
  if (!call) return "not_verified";
  const text = call.transcript?.trim() ?? "";
  return text.length >= MIN_TRANSCRIPT_CHARS ? "verified" : "not_verified";
}

function resolveRecordingAvailability(call: CallRecord | undefined): VerificationItemState {
  if (!call) return "not_verified";
  const url = call.recordingUrl?.trim();
  return url ? "verified" : "not_verified";
}

function hintForState(state: VerificationItemState): string | undefined {
  if (isEnglishUi()) {
    if (state === "verified") return "Verified";
    if (state === "failed") return "Verification failed";
    return "Not verified";
  }
  if (state === "verified") return "확인됨";
  if (state === "failed") return "확인 실패";
  return "미확인";
}

function availabilityHint(present: boolean): string {
  if (isEnglishUi()) return present ? "Available" : "None";
  return present ? "있음" : "없음";
}

function noLinkedCallHint(): string {
  return isEnglishUi() ? "No linked call" : "연결된 통화 없음";
}

export function buildRequestVerificationStatus(
  call: CallRecord | undefined,
): RequestVerificationStatus {
  const threshold = getConfidenceThreshold();

  if (!call) {
    const noCall = noLinkedCallHint();
    return {
      hasLinkedCall: false,
      items: isEnglishUi()
        ? [
            { key: "name", label: "Name verified", state: "not_verified", hint: noCall },
            { key: "address", label: "Address verified", state: "not_verified", hint: noCall },
            { key: "phone", label: "Phone verified", state: "not_verified", hint: noCall },
            { key: "transcript", label: "Transcript", state: "not_verified" },
            { key: "recording", label: "Call recording", state: "not_verified" },
          ]
        : [
            { key: "name", label: "이름 확인", state: "not_verified", hint: noCall },
            { key: "address", label: "주소 확인", state: "not_verified", hint: noCall },
            { key: "phone", label: "전화번호 확인", state: "not_verified", hint: noCall },
            { key: "transcript", label: "전사본", state: "not_verified" },
            { key: "recording", label: "통화 녹음", state: "not_verified" },
          ],
    };
  }

  const nameState = resolveFieldVerification(
    "customerName",
    call.customerName,
    call,
    threshold,
  );
  const addressState = resolveFieldVerification("address", call.address, call, threshold);
  const phoneState = resolvePhoneVerification(call);
  const transcriptState = resolveTranscriptAvailability(call);
  const recordingState = resolveRecordingAvailability(call);

  return {
    hasLinkedCall: true,
    items: isEnglishUi()
      ? [
          {
            key: "name",
            label: "Name verified",
            state: nameState,
            hint: hintForState(nameState),
          },
          {
            key: "address",
            label: "Address verified",
            state: addressState,
            hint: hintForState(addressState),
          },
          {
            key: "phone",
            label: "Phone verified",
            state: phoneState,
            hint: hintForState(phoneState),
          },
          {
            key: "transcript",
            label: "Transcript",
            state: transcriptState,
            hint: availabilityHint(transcriptState === "verified"),
          },
          {
            key: "recording",
            label: "Call recording",
            state: recordingState,
            hint: availabilityHint(recordingState === "verified"),
          },
        ]
      : [
          {
            key: "name",
            label: "이름 확인",
            state: nameState,
            hint: hintForState(nameState),
          },
          {
            key: "address",
            label: "주소 확인",
            state: addressState,
            hint: hintForState(addressState),
          },
          {
            key: "phone",
            label: "전화번호 확인",
            state: phoneState,
            hint: hintForState(phoneState),
          },
          {
            key: "transcript",
            label: "전사본",
            state: transcriptState,
            hint: availabilityHint(transcriptState === "verified"),
          },
          {
            key: "recording",
            label: "통화 녹음",
            state: recordingState,
            hint: availabilityHint(recordingState === "verified"),
          },
        ],
  };
}
