import assert from "node:assert/strict";
import test from "node:test";

function isLinkIntentSpeech(speech) {
  const LINK_INTENT_PHRASES = [
    "text link",
    "text me",
    "send me",
    "send a link",
    "the link",
    "quick link",
    "text form",
    "sms",
    "message me",
    "on my phone",
    "my phone",
    "just text",
    "just send",
    "form by text",
    "link please",
    "text please",
  ];
  const text = (speech ?? "").trim().toLowerCase();
  if (!text) return false;
  if (LINK_INTENT_PHRASES.some((phrase) => text.includes(phrase))) return true;
  if (/^(text|link|one|1)\.?$/.test(text)) return true;
  return false;
}

test("isLinkIntentSpeech detects common link phrases", () => {
  assert.equal(isLinkIntentSpeech("text me the link please"), true);
  assert.equal(isLinkIntentSpeech("can you send me a form"), true);
  assert.equal(isLinkIntentSpeech("1"), true);
  assert.equal(isLinkIntentSpeech("link"), true);
});

test("isLinkIntentSpeech rejects phone intent", () => {
  assert.equal(isLinkIntentSpeech("I want to talk on the call"), false);
  assert.equal(isLinkIntentSpeech("sewage backup in basement"), false);
});
