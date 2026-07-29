import assert from "node:assert/strict";
import test from "node:test";

import {
  parseLegalConsentBody,
  buildCustomerSmsConsentRecord,
  parseCustomerMarketingSmsConsent,
} from "../../lib/legal-consent.ts";

test("signup: terms + service SMS + service limitations required", () => {
  const failTerms = parseLegalConsentBody({
    termsAccepted: false,
    smsServiceConsent: true,
    serviceLimitationsConsent: true,
  });
  assert.equal(failTerms.ok, false);

  const failSms = parseLegalConsentBody({
    termsAccepted: true,
    smsServiceConsent: false,
    serviceLimitationsConsent: true,
  });
  assert.equal(failSms.ok, false);

  const failLimits = parseLegalConsentBody({
    termsAccepted: true,
    smsServiceConsent: true,
    serviceLimitationsConsent: false,
  });
  assert.equal(failLimits.ok, false);

  const ok = parseLegalConsentBody({
    termsAccepted: true,
    smsServiceConsent: true,
    serviceLimitationsConsent: true,
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.consent.legalVersion, "2026-09");
    assert.equal(ok.consent.serviceLimitationsVersion, "2026-09");
    assert.ok(ok.consent.serviceLimitationsAt);
    assert.equal(ok.consent.marketingEmailAt, null);
  }
});

test("signup: optional marketing opt-in stored when checked", () => {
  const ok = parseLegalConsentBody({
    termsAccepted: true,
    smsServiceConsent: true,
    serviceLimitationsConsent: true,
    marketingEmailConsent: true,
    marketingSmsConsent: true,
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.ok(ok.consent.marketingEmailAt);
    assert.ok(ok.consent.marketingSmsAt);
  }
});

test("link intake: service consent required; marketing optional", () => {
  assert.equal(buildCustomerSmsConsentRecord({ serviceConsent: false, marketingConsent: true }), null);
  const svcOnly = buildCustomerSmsConsentRecord({ serviceConsent: true, marketingConsent: false });
  assert.ok(svcOnly?.smsServiceAt);
  assert.equal(svcOnly?.smsMarketingAt, null);

  const both = buildCustomerSmsConsentRecord({ serviceConsent: true, marketingConsent: true });
  assert.ok(both?.smsMarketingAt);
  assert.equal(parseCustomerMarketingSmsConsent("1"), true);
  assert.equal(parseCustomerMarketingSmsConsent("0"), false);
});
