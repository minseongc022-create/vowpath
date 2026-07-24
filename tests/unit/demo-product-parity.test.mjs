import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRetellBookingAgentPatch,
  buildRetellEstimateAgentPatch,
  RETELL_PROMPT_VERSION,
} from "../../lib/retell-agent-settings.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const demoScript = readFileSync(join(root, "lib/demo-interactive-script.ts"), "utf8");
const phoneScript = readFileSync(join(root, "lib/demo-phone-script.ts"), "utf8");
const demoConfig = readFileSync(join(root, "lib/demo-vertical-config.ts"), "utf8");

test("main menu matches Twilio wording", () => {
  assert.match(demoScript, /say service or press 1/i);
  assert.match(demoScript, /say estimate or press 2/i);
});

test("demo scripts include pick-time SMS and live map", () => {
  assert.match(demoScript, /Pick your visit time here/i);
  assert.match(demoScript, /Live map:/i);
  assert.match(phoneScript, /I'll text you a secure link to pick your visit time/i);
  assert.match(demoConfig, /pick-time SMS/i);
});

test("demo jump constants point at estimate then link branches", () => {
  assert.match(demoScript, /const ESTIMATE_START = 20/);
  assert.match(demoScript, /const LINK_START = 25/);
});

test("Retell listen-fast tuning keeps accurate STT", () => {
  assert.match(RETELL_PROMPT_VERSION, /listen-fast-v28/);
  const booking = buildRetellBookingAgentPatch();
  const estimate = buildRetellEstimateAgentPatch();
  assert.equal(booking.stt_mode, "accurate");
  assert.equal(booking.responsiveness, 0.74);
  assert.equal(booking.voice_speed, 0.97);
  assert.equal(estimate.responsiveness, 0.76);
  assert.equal(booking.interruption_sensitivity, 0.28);
  assert.equal(booking.reminder_trigger_ms, 12000);
});
