import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

test("main menu press 1 opens channel choice (phone vs text link) — never skip to Retell", () => {
  const src = readFileSync(join(root, "app/api/twilio/main-menu/route.ts"), "utf8");
  assert.match(src, /twimlGatherChannelChoice/);
  assert.match(src, /\/api\/twilio\/channel/);
  assert.match(src, /twimlGatherEstimateMenu/);
  // Regression guard: one-tap removal of channel menu must not return.
  assert.equal(
    /digit === "1"[\s\S]{0,400}buildRetellBridgeTwiml\(\{\s*\.\.\.bridgeParams,\s*ivrPath:\s*"phone_booking"/.test(
      src,
    ),
    false,
  );
});

test("channel choice copy asks phone vs text and allows speech", () => {
  const src = readFileSync(join(root, "lib/link-intake-copy.ts"), "utf8");
  assert.match(src, /continue on the phone, or by text/i);
  assert.match(src, /Just say phone or text/i);
  assert.match(src, /channelChoiceRetryPrompt/);
});

test("channel Gather prioritizes speech and posts empty results", () => {
  const src = readFileSync(join(root, "lib/twilio-xml.ts"), "utf8");
  assert.match(src, /input="speech dtmf"/);
  assert.match(src, /actionOnEmptyResult="true"/);
  assert.match(src, /CHANNEL_SPEECH_HINTS/);
});

test("Retell TS and sync script voice patches stay aligned", () => {
  const ts = readFileSync(join(root, "lib/retell-agent-settings.ts"), "utf8");
  const mjs = readFileSync(join(root, "scripts/lib/retell-agent-settings.mjs"), "utf8");
  assert.match(ts, /channel-menu-clear-voice-v31/);
  assert.match(mjs, /channel-menu-clear-voice-v31/);
  assert.match(ts, /volume:\s*1\.55/);
  assert.match(mjs, /volume:\s*1\.55/);
  assert.match(ts, /voice_speed:\s*0\.9/);
  assert.match(mjs, /voice_speed:\s*0\.9/);
  assert.match(ts, /responsiveness:\s*0\.86/);
  assert.match(mjs, /responsiveness:\s*0\.86/);
});
