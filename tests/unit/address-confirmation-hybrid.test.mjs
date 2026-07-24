import assert from "node:assert/strict";
import test from "node:test";
import {
  markAddressConfirmed,
  needsAddressConfirmationUi,
  requiresAddressConfirmation,
  resolveAddressConfirmationFromIntake,
} from "../../lib/address/confirmation.ts";
import {
  ADDRESS_PENDING_MARKER,
  isAddressPending,
  normalizePhoneIntakeAddress,
  preferSpokenPhoneAddress,
} from "../../lib/address/pending.ts";
import { shouldAutoStartTechDispatch } from "../../lib/tech-dispatch/policy.ts";

test("pending address helpers", () => {
  assert.equal(isAddressPending(""), true);
  assert.equal(isAddressPending(ADDRESS_PENDING_MARKER), true);
  assert.equal(isAddressPending("4821 Oak Drive, Austin TX 78741"), false);
  assert.equal(normalizePhoneIntakeAddress(""), ADDRESS_PENDING_MARKER);
  assert.equal(
    preferSpokenPhoneAddress("4821 Oak Drive, Austin TX", ""),
    "4821 Oak Drive, Austin TX",
  );
  assert.equal(preferSpokenPhoneAddress("", "short"), ADDRESS_PENDING_MARKER);
});

test("phone intake low confidence requires portal confirm before dispatch", () => {
  const low = resolveAddressConfirmationFromIntake({
    address: "4821 Oak Drive, Austin TX 78741",
    confidence: {
      address: 40,
      customerName: 90,
      serviceLocation: 90,
      issueType: 90,
    },
    channel: "phone",
  });
  assert.equal(low.status, "pending_required");
  assert.equal(requiresAddressConfirmation(low, low.spokenAddress), true);
  assert.equal(needsAddressConfirmationUi(low, low.spokenAddress), true);
});

test("phone intake high confidence still shows confirm UI until portal submit", () => {
  const high = resolveAddressConfirmationFromIntake({
    address: "4821 Oak Drive, Austin TX 78741",
    confidence: {
      address: 92,
      customerName: 90,
      serviceLocation: 90,
      issueType: 90,
    },
    channel: "phone",
  });
  assert.equal(high.status, "pending_review");
  assert.equal(requiresAddressConfirmation(high, high.spokenAddress), false);
  assert.equal(needsAddressConfirmationUi(high, high.spokenAddress), true);

  const confirmed = markAddressConfirmed({
    previous: high,
    confirmedAddress: "4821 Oak Drive, Austin TX 78741",
  });
  assert.equal(confirmed.status, "confirmed");
  assert.equal(needsAddressConfirmationUi(confirmed, confirmed.confirmedAddress), false);
});

test("missing phone address is pending_required", () => {
  const missing = resolveAddressConfirmationFromIntake({
    address: "",
    channel: "phone",
  });
  assert.equal(missing.status, "pending_required");
  assert.equal(requiresAddressConfirmation(missing, ADDRESS_PENDING_MARKER), true);
});

test("sms link typed address starts confirmed", () => {
  const link = resolveAddressConfirmationFromIntake({
    address: "910 Cedar Lane, Round Rock TX 78664",
    confidence: {
      address: 100,
      customerName: 100,
      serviceLocation: 100,
      issueType: 100,
    },
    channel: "sms_link",
  });
  assert.equal(link.status, "confirmed");
});

test("tech dispatch blocked while address confirmation required", () => {
  assert.equal(
    shouldAutoStartTechDispatch(
      { enabled: true, assignOnApprove: true },
      "scheduled",
      { addressConfirmationRequired: true },
    ),
    false,
  );
  assert.equal(
    shouldAutoStartTechDispatch(
      { enabled: true, assignOnApprove: true },
      "scheduled",
      { addressConfirmationRequired: false },
    ),
    true,
  );
});
