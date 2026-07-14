import assert from "node:assert/strict";
import {
  canonicalMarketingUrl,
  isMarketingHostAlias,
  normalizeHostname,
} from "../../lib/canonical-host.ts";

assert.equal(normalizeHostname("WWW.Effiroad.com:443"), "www.effiroad.com");
assert.equal(isMarketingHostAlias("www.effiroad.com"), true);
assert.equal(isMarketingHostAlias("vowroad.com"), true);
assert.equal(isMarketingHostAlias("effiroad.com"), false);
assert.equal(isMarketingHostAlias("link.effiroad.com"), false);
assert.equal(
  canonicalMarketingUrl("/pricing", "?x=1"),
  "https://effiroad.com/pricing?x=1",
);

console.log("canonical-host checks passed");
