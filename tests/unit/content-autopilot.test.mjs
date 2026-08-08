import assert from "node:assert/strict";
import test from "node:test";
import { countChars, qualityOk, pickTitle, CLOUD_BRANDS } from "../../lib/content-autopilot/produce.ts";
import { runCloudGenerateAll } from "../../lib/content-autopilot/run.ts";
import { ensurePin } from "../../lib/content-autopilot/store.ts";

test("quality gate rejects fabrication", () => {
  const bad = qualityOk("속보 단독", "# t\n\n## a\n## b\n## c\n## d\n## e\n" + "가".repeat(2100), 2000);
  assert.equal(bad.ok, false);
});

test("pickTitle returns non-empty", () => {
  assert.ok(pickTitle("personal-naver").length > 5);
});

test("cloud generate all produces 3 posts >= 2000 chars", async () => {
  process.env.AUTOPILOT_PIN = "123456";
  const pin = await ensurePin();
  assert.equal(pin, "123456");
  assert.equal(CLOUD_BRANDS.length, 3);
  const job = await runCloudGenerateAll();
  assert.equal(job.status, "done", job.error);
  assert.equal(job.results?.length, 3);
  for (const r of job.results || []) {
    assert.ok(r.chars >= 2000, `${r.brandId} chars=${r.chars}`);
    assert.ok(countChars(r.markdown) >= 2000);
  }
});
