import assert from "node:assert/strict";
import test from "node:test";
import {
  isLinkIntentSpeech,
  isPhoneIntentSpeech,
} from "../../lib/link-intent-speech.ts";

test("isLinkIntentSpeech detects common link phrases", () => {
  assert.equal(isLinkIntentSpeech("text me the link please"), true);
  assert.equal(isLinkIntentSpeech("can you send me a form"), true);
  assert.equal(isLinkIntentSpeech("shoot me a text"), true);
  assert.equal(isLinkIntentSpeech("1"), true);
  assert.equal(isLinkIntentSpeech("text"), true);
  assert.equal(isLinkIntentSpeech("form"), true);
});

test("isLinkIntentSpeech rejects phone intent", () => {
  assert.equal(isLinkIntentSpeech("I want to talk on the call"), false);
  assert.equal(isLinkIntentSpeech("sewage backup in basement"), false);
});

test("isPhoneIntentSpeech detects stay-on-call phrases", () => {
  assert.equal(isPhoneIntentSpeech("I want to talk on the phone"), true);
  assert.equal(isPhoneIntentSpeech("stay on the call"), true);
  assert.equal(isPhoneIntentSpeech("2"), true);
  assert.equal(isPhoneIntentSpeech("phone"), true);
});

test("isPhoneIntentSpeech rejects link intent", () => {
  assert.equal(isPhoneIntentSpeech("text me the link"), false);
  assert.equal(isPhoneIntentSpeech("send a link"), false);
});
