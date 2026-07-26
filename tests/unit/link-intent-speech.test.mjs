import assert from "node:assert/strict";
import test from "node:test";
import {
  isLinkIntentSpeech,
  isPhoneIntentSpeech,
} from "../../lib/link-intent-speech.ts";
import { isUrgentCallerSpeech } from "../../lib/urgent-speech-bypass.ts";

/** Mirror lib/ivr-channel-choice.ts booking resolver. */
function resolveBookingChannelChoice(digit, speech) {
  if (digit === "1") return "link";
  if (digit === "2") return "phone";
  const said = (speech ?? "").trim();
  if (isPhoneIntentSpeech(said)) return "phone";
  if (isLinkIntentSpeech(said, { allowDigitWords: true })) return "link";
  if (isUrgentCallerSpeech(said)) return "phone";
  return "unclear";
}

test("isLinkIntentSpeech detects common link phrases", () => {
  assert.equal(isLinkIntentSpeech("text me the link please"), true);
  assert.equal(isLinkIntentSpeech("can you send me a form"), true);
  assert.equal(isLinkIntentSpeech("shoot me a text"), true);
  assert.equal(isLinkIntentSpeech("by text"), true);
  assert.equal(isLinkIntentSpeech("text"), true);
  assert.equal(isLinkIntentSpeech("form"), true);
  assert.equal(isLinkIntentSpeech("1", { allowDigitWords: true }), true);
  assert.equal(isLinkIntentSpeech("one", { allowDigitWords: true }), true);
});

test("main menu must not treat bare 1/one as link intent", () => {
  assert.equal(isLinkIntentSpeech("1", { allowDigitWords: false }), false);
  assert.equal(isLinkIntentSpeech("one", { allowDigitWords: false }), false);
  assert.equal(isLinkIntentSpeech("text", { allowDigitWords: false }), true);
});

test("isLinkIntentSpeech rejects phone intent", () => {
  assert.equal(isLinkIntentSpeech("I want to talk on the call"), false);
  assert.equal(isLinkIntentSpeech("sewage backup in basement"), false);
  assert.equal(isLinkIntentSpeech("phone"), false);
});

test("isPhoneIntentSpeech detects stay-on-call phrases", () => {
  assert.equal(isPhoneIntentSpeech("I want to talk on the phone"), true);
  assert.equal(isPhoneIntentSpeech("stay on the call"), true);
  assert.equal(isPhoneIntentSpeech("by phone"), true);
  assert.equal(isPhoneIntentSpeech("over the phone"), true);
  assert.equal(isPhoneIntentSpeech("2"), true);
  assert.equal(isPhoneIntentSpeech("phone"), true);
  assert.equal(isPhoneIntentSpeech("talk"), true);
});

test("isPhoneIntentSpeech rejects link intent", () => {
  assert.equal(isPhoneIntentSpeech("text me the link"), false);
  assert.equal(isPhoneIntentSpeech("send a link"), false);
  assert.equal(isPhoneIntentSpeech("by text"), false);
});

test("spoken phone or text resolves on channel menu", () => {
  assert.equal(resolveBookingChannelChoice(null, "phone"), "phone");
  assert.equal(resolveBookingChannelChoice(null, "text"), "link");
  assert.equal(resolveBookingChannelChoice(null, "by phone please"), "phone");
  assert.equal(resolveBookingChannelChoice(null, "by text"), "link");
  assert.equal(resolveBookingChannelChoice(null, "talk on the phone"), "phone");
  assert.equal(resolveBookingChannelChoice("1", null), "link");
  assert.equal(resolveBookingChannelChoice("2", null), "phone");
});
