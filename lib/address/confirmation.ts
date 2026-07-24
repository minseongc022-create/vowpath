/**
 * Hybrid address UX:
 * - Phone collects verbal address + read-back
 * - SMS portal always lets the customer confirm/edit + pick visit time
 * - Low confidence / missing address blocks schedule & crew dispatch until confirmed
 */

import type { FieldConfidence } from "../call-intake/types";
import { isAddressPending } from "./pending.js";

/** Keep in sync with DEFAULT_FIELD_THRESHOLDS.address in confidence-config.ts */
const ADDRESS_CONFIRM_CONFIDENCE_MIN = 85;

export type AddressConfirmationStatus =
  | "pending_required"
  | "pending_review"
  | "confirmed";

export type AddressConfirmationRecord = {
  status: AddressConfirmationStatus;
  /** Spoken / extracted address at intake (before portal confirm). */
  spokenAddress?: string;
  addressConfidence?: number;
  source?: "phone" | "sms_link" | "portal";
  confirmedAt?: string;
  confirmedAddress?: string;
};

/** True when crew must not roll until the customer confirms on the link. */
export function requiresAddressConfirmation(
  record: AddressConfirmationRecord | null | undefined,
  address?: string | null,
): boolean {
  if (isAddressPending(address)) return true;
  if (!record) return false;
  return record.status === "pending_required";
}

/** True when portal should show editable address (pre-filled when spoken). */
export function needsAddressConfirmationUi(
  record: AddressConfirmationRecord | null | undefined,
  address?: string | null,
): boolean {
  if (isAddressPending(address)) return true;
  if (!record) return false;
  return record.status === "pending_required" || record.status === "pending_review";
}

export function resolveAddressConfirmationFromIntake(params: {
  address: string;
  confidence?: FieldConfidence | null;
  channel: "phone" | "sms_link" | "webchat";
}): AddressConfirmationRecord {
  const address = (params.address ?? "").trim();
  const addressConfidence = params.confidence?.address;

  if (params.channel === "sms_link" || params.channel === "webchat") {
    // Typed / map address on the link is already confirmed.
    if (!isAddressPending(address)) {
      return {
        status: "confirmed",
        spokenAddress: address,
        addressConfidence: addressConfidence ?? 100,
        source: params.channel === "webchat" ? "portal" : "sms_link",
        confirmedAt: new Date().toISOString(),
        confirmedAddress: address,
      };
    }
    return {
      status: "pending_required",
      spokenAddress: address || undefined,
      addressConfidence,
      source: "sms_link",
    };
  }

  // Phone intake
  if (isAddressPending(address)) {
    return {
      status: "pending_required",
      spokenAddress: address || undefined,
      addressConfidence: addressConfidence ?? 0,
      source: "phone",
    };
  }

  const conf = typeof addressConfidence === "number" ? addressConfidence : 0;
  if (conf < ADDRESS_CONFIRM_CONFIDENCE_MIN) {
    return {
      status: "pending_required",
      spokenAddress: address,
      addressConfidence: conf,
      source: "phone",
    };
  }

  return {
    status: "pending_review",
    spokenAddress: address,
    addressConfidence: conf,
    source: "phone",
  };
}

export function markAddressConfirmed(params: {
  previous?: AddressConfirmationRecord | null;
  confirmedAddress: string;
}): AddressConfirmationRecord {
  return {
    status: "confirmed",
    spokenAddress: params.previous?.spokenAddress,
    addressConfidence: params.previous?.addressConfidence,
    source: "portal",
    confirmedAt: new Date().toISOString(),
    confirmedAddress: params.confirmedAddress.trim(),
  };
}

export function addressConfirmationLabel(
  record: AddressConfirmationRecord | null | undefined,
  address?: string | null,
): string | null {
  if (isAddressPending(address) || record?.status === "pending_required") {
    return "Waiting on customer address confirm";
  }
  if (record?.status === "pending_review") {
    return "Address heard — confirm on link";
  }
  if (record?.status === "confirmed") {
    return "Address confirmed by customer";
  }
  return null;
}
