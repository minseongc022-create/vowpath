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

test("phone prompt collects verbal address then SMS confirm", () => {
  assert.match(RETELL_PROMPT_VERSION, /clear-fast-voice-v36|clear-fast-voice-v35/);
  assert.match(prompt, /Collect: name, full street address/i);
  assert.match(prompt, /confirm that address and pick your visit time/i);
  assert.doesNotMatch(prompt, /Do NOT collect the full street address on the phone/i);
});

test("pending address helpers", () => {
  assert.equal(isAddressPending(""), true);
  assert.equal(isAddressPending(ADDRESS_PENDING_MARKER), true);
  assert.equal(isAddressPending("4821 Oak Drive, Austin TX 78741"), false);
  assert.equal(normalizePhoneIntakeAddress(""), ADDRESS_PENDING_MARKER);
});

test("demo uses hybrid address + pick-time flow", () => {
  assert.match(demoScript, /Request received - confirm:/i);
  assert.match(demoScript, /Caller says address/);
  assert.match(demoScript, /const ESTIMATE_START = 22/);
  assert.match(demoScript, /Text DEPARTING/);
  assert.match(demoScript, /const LINK_START = 27/);
  assert.match(demoScript, /Service — say phone or text/);
});

test("landing FAQ covers owner essentials", () => {
  assert.match(faq, /What is Effiroad\?/i);
  assert.match(faq, /How do customers book\?/i);
  assert.match(faq, /Quotes & estimate follow-up\?/i);
});

test("Retell keeps accurate STT while clear and snappy", () => {
  const booking = buildRetellBookingAgentPatch();
  assert.equal(booking.stt_mode, "accurate");
  assert.ok(Number(booking.responsiveness) >= 0.95);
  assert.ok(Number(booking.volume) <= 1.1);
  assert.ok(Number(booking.voice_speed) >= 1.08);
  assert.equal(booking.voice_model, "eleven_turbo_v2_5");
});
