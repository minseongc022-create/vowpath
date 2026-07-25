import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

test("layout allows browser translate (no sitewide notranslate block)", () => {
  const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
  assert.equal(layout.includes('translate="no"'), false);
  assert.equal(layout.includes('content="notranslate"'), false);
});

test("brand logo opts out of translate so EFFIROAD stays stable", () => {
  const logo = readFileSync(join(root, "components/brand/BrandLogo.tsx"), "utf8");
  assert.match(logo, /translate=["']no["']/);
});

test("customer verification accepts common US SMS synonyms", () => {
  const src = readFileSync(join(root, "lib/customer-verification/flow.ts"), "utf8");
  assert.match(src, /YEAH|YEP|OK|CORRECT|SI/);
  assert.match(src, /NOPE|WRONG|INCORRECT/);
});

test("deepgram retranscribe does not blindly overwrite confirmed addresses", () => {
  const src = readFileSync(join(root, "lib/call-intake/deepgram-retranscribe.ts"), "utf8");
  assert.match(src, /addressLocked|pending_required|confirmed/);
  assert.match(src, /deepgramTranscript/);
  assert.equal(src.includes("customerName: draft.customerName,\n      address: draft.address"), false);
});

test("shop AI has generative conversational fallback", () => {
  const gen = readFileSync(join(root, "lib/ai-admin/generative.ts"), "utf8");
  const route = readFileSync(join(root, "app/api/effiroad-ai/route.ts"), "utf8");
  assert.match(gen, /generateShopAiReply/);
  assert.match(route, /generateShopAiReply/);
  assert.match(route, /intent\.kind === "general"/);
});

test("retell submit-intake prefers spoken tool args for core fields", () => {
  const src = readFileSync(join(root, "app/api/retell/tools/submit-intake/route.ts"), "utf8");
  assert.match(src, /args\.customerName/);
  assert.match(src, /args\.issueType/);
  assert.match(src, /preferSpokenPhoneAddress/);
});
