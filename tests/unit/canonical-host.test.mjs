import assert from "node:assert/strict";
import {
  buildCanonicalRedirectUrl,
  canonicalMarketingUrl,
  isDecommissionedHost,
  isMarketingHostAlias,
  normalizeHostname,
  resolveCanonicalOrigin,
} from "../../lib/canonical-host.ts";

assert.equal(normalizeHostname("WWW.Effiroad.com:443"), "www.effiroad.com");
assert.equal(isMarketingHostAlias("www.effiroad.com"), true);
assert.equal(isMarketingHostAlias("vowroad.com"), true);
assert.equal(isDecommissionedHost("hvacsvc.link"), true);
assert.equal(isDecommissionedHost("www.hvacsvc.link"), true);
assert.equal(isMarketingHostAlias("hvacsvc.link"), false);
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
assert.equal(buildCanonicalRedirectUrl("hvacsvc.link", "/get-started", ""), null);

console.log("canonical-host checks passed");
