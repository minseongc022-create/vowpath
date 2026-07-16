import assert from "node:assert/strict";
import {
  buildCanonicalRedirectUrl,
  canonicalMarketingUrl,
  isMarketingHostAlias,
  normalizeHostname,
  resolveCanonicalOrigin,
} from "../../lib/canonical-host.ts";

assert.equal(normalizeHostname("WWW.Effiroad.com:443"), "www.effiroad.com");
assert.equal(isMarketingHostAlias("www.effiroad.com"), true);
assert.equal(isMarketingHostAlias("vowroad.com"), true);
assert.equal(isMarketingHostAlias("hvacsvc.link"), true);
assert.equal(isMarketingHostAlias("www.hvacsvc.link"), true);
assert.equal(isMarketingHostAlias("effiroad.com"), false);
assert.equal(isMarketingHostAlias("link.effiroad.com"), false);
assert.equal(
  canonicalMarketingUrl("/pricing", "?x=1"),
  "https://effiroad.com/pricing?x=1",
);
assert.equal(resolveCanonicalOrigin("link.vowroad.com"), "https://link.effiroad.com");
assert.equal(
  buildCanonicalRedirectUrl("www.effiroad.com", "/pricing", "?a=1"),
  "https://effiroad.com/pricing?a=1",
);
assert.equal(
  buildCanonicalRedirectUrl("link.vowroad.com", "/r/abc", ""),
  "https://link.effiroad.com/r/abc",
);
assert.equal(
  buildCanonicalRedirectUrl("hvacsvc.link", "/get-started", ""),
  "https://effiroad.com/get-started",
);
assert.equal(
  buildCanonicalRedirectUrl("www.hvacsvc.link", "/get-started", "?ref=1"),
  "https://effiroad.com/get-started?ref=1",
);

console.log("canonical-host checks passed");
