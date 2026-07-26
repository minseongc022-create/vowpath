import assert from "node:assert/strict";
import test from "node:test";
import {
  isLinkIntentSpeech,
  isPhoneIntentSpeech,
} from "../../lib/link-intent-speech.ts";
import { isUrgentCallerSpeech } from "../../lib/urgent-speech-bypass.ts";

/** Mirror lib/ivr-channel-choice.ts — keep in sync when routing rules change. */
function resolveBookingChannelChoice(digit, speech) {
  if (digit === "1") return "link";
  if (digit === "2") return "phone";
  const said = (speech ?? "").trim();
  if (isPhoneIntentSpeech(said)) return "phone";
  if (isLinkIntentSpeech(said, { allowDigitWords: true })) return "link";
  if (isUrgentCallerSpeech(said)) return "phone";
  return "unclear";
}

function resolveEstimateChannelChoice(digit, speech) {
  if (digit === "2") return "link";
  if (digit === "1") return "phone";
  const said = (speech ?? "").trim();
  if (isPhoneIntentSpeech(said)) return "phone";
  if (isLinkIntentSpeech(said, { allowDigitWords: true })) return "link";
  return "unclear";
}

function resolveMainMenuChoice(digit, speech) {
  if (digit === "1") return "booking";
  if (digit === "2") return "estimate";
  const text = (speech ?? "").trim().toLowerCase();
  if (!text) return "unclear";
  if (
    text.includes("estimate") ||
    text.includes("quote") ||
    text.includes("bid") ||
    text.includes("project")
  ) {
    return "estimate";
  }
  if (
    isUrgentCallerSpeech(text) ||
    text.includes("service") ||
    text.includes("book") ||
    text.includes("emergency") ||
    text.includes("repair")
  ) {
    return "booking";
  }
  return "unclear";
}

test("resolveBookingChannelChoice: digit and speech for link", () => {
  assert.equal(resolveBookingChannelChoice("1", null), "link");
  assert.equal(resolveBookingChannelChoice(null, "text link please"), "link");
  assert.equal(resolveBookingChannelChoice(null, "text"), "link");
  assert.equal(resolveBookingChannelChoice(null, "by text"), "link");
});

test("resolveBookingChannelChoice: digit and speech for phone", () => {
  assert.equal(resolveBookingChannelChoice("2", null), "phone");
  assert.equal(resolveBookingChannelChoice(null, "talk on the phone"), "phone");
  assert.equal(resolveBookingChannelChoice(null, "phone"), "phone");
  assert.equal(resolveBookingChannelChoice(null, "by phone"), "phone");
  assert.equal(resolveBookingChannelChoice(null, "I have water in my basement"), "phone");
});

test("resolveEstimateChannelChoice: inverted digit mapping", () => {
  assert.equal(resolveEstimateChannelChoice("1", null), "phone");
  assert.equal(resolveEstimateChannelChoice("2", null), "link");
  assert.equal(resolveEstimateChannelChoice(null, "text link"), "link");
  assert.equal(resolveEstimateChannelChoice(null, "talk on the phone"), "phone");
});

test("resolveMainMenuChoice: service vs estimate", () => {
  assert.equal(resolveMainMenuChoice("1", null), "booking");
  assert.equal(resolveMainMenuChoice("2", null), "estimate");
  assert.equal(resolveMainMenuChoice(null, "I need an estimate"), "estimate");
  assert.equal(resolveMainMenuChoice(null, "water damage emergency"), "booking");
  assert.equal(resolveMainMenuChoice(null, "hello"), "unclear");
});
