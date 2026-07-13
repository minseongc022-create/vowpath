import assert from "node:assert/strict";
import test from "node:test";

import { getCarrierQuickActions } from "../../lib/forwarding-carrier-codes.ts";
import { getForwardingGuideSteps } from "../../lib/forwarding-guides-en.ts";
import {
  evaluateForwardingVerifyHit,
  phonesMatchE164,
} from "../../lib/forwarding-verify.ts";

const EFFIROAD = "+12255291680";

test("getCarrierQuickActions: AT&T uses GSM no-answer with 20s ring", () => {
  const actions = getCarrierQuickActions("att", EFFIROAD);
  assert.equal(actions[0]?.dial, "**61*12255291680*11*20#");
  assert.equal(actions[0]?.deactivateDial, "##61#");
});

test("getCarrierQuickActions: T-Mobile primary uses 20-second delay code", () => {
  const actions = getCarrierQuickActions("tmobile", EFFIROAD);
  assert.equal(actions[0]?.dial, "**61*12255291680**20#");
  assert.equal(actions[1]?.dial, "**61*12255291680#");
});

test("getCarrierQuickActions: Verizon uses *71 conditional code", () => {
  const actions = getCarrierQuickActions("verizon", EFFIROAD);
  assert.equal(actions[0]?.dial, "*712255291680");
  assert.equal(actions[0]?.deactivateDial, "*73");
});

test("getForwardingGuideSteps: T-Mobile steps mention 20-second code", () => {
  const steps = getForwardingGuideSteps("tmobile", "overflow", EFFIROAD);
  assert.ok(steps.some((s) => s.includes("**61*12255291680**20#")));
});

test("phonesMatchE164: normalizes US numbers", () => {
  assert.equal(phonesMatchE164("(225) 529-1680", "+12255291680"), true);
  assert.equal(phonesMatchE164("+12255291680", "2255291680"), true);
  assert.equal(phonesMatchE164("+15125550100", "+12255291680"), false);
});

test("evaluateForwardingVerifyHit: direct mode accepts any inbound", () => {
  const result = evaluateForwardingVerifyHit(
    {
      id: "1",
      userId: "u",
      callSid: "CA1",
      from: "+15551234567",
      to: EFFIROAD,
      status: "voice_started",
      createdAt: new Date().toISOString(),
    },
    { testMode: "direct", shopPhone: "+15125550100" },
  );
  assert.equal(result.verified, true);
  assert.equal(result.confidence, "direct");
});

test("evaluateForwardingVerifyHit: forward mode with matching ForwardedFrom", () => {
  const result = evaluateForwardingVerifyHit(
    {
      id: "1",
      userId: "u",
      callSid: "CA1",
      from: "+15551234567",
      to: EFFIROAD,
      status: "voice_started",
      forwardedFrom: "+15125550100",
      createdAt: new Date().toISOString(),
    },
    { testMode: "forward", shopPhone: "(512) 555-0100" },
  );
  assert.equal(result.verified, true);
  assert.equal(result.confidence, "forwarded");
});

test("evaluateForwardingVerifyHit: forward mode rejects mismatched ForwardedFrom", () => {
  const result = evaluateForwardingVerifyHit(
    {
      id: "1",
      userId: "u",
      callSid: "CA1",
      from: "+15551234567",
      to: EFFIROAD,
      status: "voice_started",
      forwardedFrom: "+19998887777",
      createdAt: new Date().toISOString(),
    },
    { testMode: "forward", shopPhone: "+15125550100" },
  );
  assert.equal(result.verified, false);
  assert.equal(result.reason, "wrong_forward_source");
});

test("evaluateForwardingVerifyHit: forward mode without ForwardedFrom is inbound_only", () => {
  const result = evaluateForwardingVerifyHit(
    {
      id: "1",
      userId: "u",
      callSid: "CA1",
      from: "+15551234567",
      to: EFFIROAD,
      status: "voice_started",
      createdAt: new Date().toISOString(),
    },
    { testMode: "forward", shopPhone: "+15125550100" },
  );
  assert.equal(result.verified, true);
  assert.equal(result.confidence, "inbound_only");
});
