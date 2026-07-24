import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRetellBookingAgentPatch,
  RETELL_PROMPT_VERSION,
} from "../../lib/retell-agent-settings.ts";
import {
  ADDRESS_PENDING_MARKER,
  isAddressPending,
  normalizePhoneIntakeAddress,
} from "../../lib/address/pending.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const demoScript = readFileSync(join(root, "lib/demo-interactive-script.ts"), "utf8");
const prompt = readFileSync(join(root, "lib/retell-prompt.ts"), "utf8");
const faq = readFileSync(join(root, "lib/content-marketing-en.ts"), "utf8");

test("phone prompt defers address to SMS link", () => {
  assert.match(RETELL_PROMPT_VERSION, /address-link-v29/);
  assert.match(prompt, /Do NOT collect the full street address on the phone/i);
  assert.match(prompt, /confirm your address and pick your visit time/i);
});

test("pending address helpers", () => {
  assert.equal(isAddressPending(""), true);
  assert.equal(isAddressPending(ADDRESS_PENDING_MARKER), true);
  assert.equal(isAddressPending("4821 Oak Drive, Austin TX 78741"), false);
  assert.equal(normalizePhoneIntakeAddress(""), ADDRESS_PENDING_MARKER);
});

test("demo uses address+pick-time SMS copy", () => {
  assert.match(demoScript, /Confirm address & pick visit time/i);
  assert.match(demoScript, /const ESTIMATE_START = 18/);
  assert.match(demoScript, /const LINK_START = 23/);
});

test("landing explains restoration approval criteria", () => {
  assert.match(faq, /When does restoration need my 1 \/ 2 approval/i);
  assert.match(faq, /Cat-3 sewage/i);
});

test("Retell keeps accurate STT while snappy", () => {
  const booking = buildRetellBookingAgentPatch();
  assert.equal(booking.stt_mode, "accurate");
  assert.equal(booking.responsiveness, 0.74);
});
