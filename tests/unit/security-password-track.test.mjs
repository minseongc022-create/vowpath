import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePasswordPolicy,
  passwordPolicyError,
} from "../../lib/password-policy.ts";
import { publicTrackSnapshot } from "../../lib/visit-tracking/public-snapshot.ts";
import { twilioSayVoiceEnUs } from "../../lib/twilio-say-voice.ts";

test("password policy rejects short or simple passwords", () => {
  assert.ok(passwordPolicyError("short"));
  assert.ok(passwordPolicyError("alllowercase1!"));
  assert.ok(passwordPolicyError("ALLUPPERCASE1!"));
  assert.ok(passwordPolicyError("NoSpecial123"));
  assert.ok(passwordPolicyError("NoNumber!!AA"));
  assert.equal(passwordPolicyError("GoodPass1!"), null);
});

test("password strength levels move from weak to strong", () => {
  assert.equal(evaluatePasswordPolicy("abc").level, "weak");
  assert.equal(evaluatePasswordPolicy("GoodPass1!").level, "strong");
  assert.equal(evaluatePasswordPolicy("GoodPass1!").ok, true);
});

test("publicTrackSnapshot hides coordinates after arrive/end", () => {
  const base = {
    id: "s1",
    userId: "u1",
    bookingId: "b1",
    customerToken: "c",
    techToken: "t",
    shopName: "Shop",
    customerName: "Pat",
    techName: "Alex",
    status: "en_route",
    etaMinutes: 12,
    startedAt: "2026-01-01T00:00:00.000Z",
    arrivedAt: null,
    lat: 30.1,
    lng: -97.7,
    heading: 90,
    speedMps: 5,
    updatedAt: "2026-01-01T00:01:00.000Z",
    expiresAt: "2099-01-01T00:00:00.000Z",
  };

  const live = publicTrackSnapshot({ ...base, status: "en_route" });
  assert.equal(live.lat, 30.1);
  assert.equal(live.lng, -97.7);

  const arrived = publicTrackSnapshot({ ...base, status: "arrived" });
  assert.equal(arrived.lat, null);
  assert.equal(arrived.lng, null);
  assert.equal(arrived.heading, null);
  assert.equal(arrived.etaMinutes, null);

  const ended = publicTrackSnapshot({ ...base, status: "ended" });
  assert.equal(ended.lat, null);
  assert.equal(ended.lng, null);
});

test("Twilio menu voice defaults to Charon (trustworthy male)", () => {
  assert.match(twilioSayVoiceEnUs(), /Charon/);
});
