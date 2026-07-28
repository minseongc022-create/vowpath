import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseDepartingPhrase,
  parseOnMyWayMinutes,
  looksLikeOnMyWayAttempt,
} from "../../lib/tech-dispatch/on-my-way-parse.ts";

const sms = readFileSync(join(process.cwd(), "lib/sms-templates.ts"), "utf8");

test("parseDepartingPhrase accepts common English depart phrases", () => {
  const phrases = [
    "DEPARTING",
    "departing",
    "heading out",
    "on my way",
    "leaving",
    "otw",
    "omw",
    "en route",
    "headed out",
  ];
  for (const phrase of phrases) {
    assert.equal(parseDepartingPhrase(phrase), true, phrase);
  }
});

test("parseDepartingPhrase rejects minute-only replies", () => {
  assert.equal(parseDepartingPhrase("30"), false);
  assert.equal(parseDepartingPhrase("OTW30"), false);
});

test("parseOnMyWayMinutes still accepts minute replies", () => {
  assert.equal(parseOnMyWayMinutes("30"), 30);
  assert.equal(parseOnMyWayMinutes("OTW15"), 15);
  assert.equal(parseOnMyWayMinutes("heading out 45"), 45);
});

test("looksLikeOnMyWayAttempt covers departing and minutes", () => {
  assert.equal(looksLikeOnMyWayAttempt("departing"), true);
  assert.equal(looksLikeOnMyWayAttempt("30"), true);
  assert.equal(looksLikeOnMyWayAttempt("hello"), false);
});

test("sms templates use DEPARTING and Track live copy", () => {
  assert.match(sms, /Text DEPARTING/);
  assert.match(sms, /Track live:/);
  assert.doesNotMatch(sms, /Track ETA:/);
});
