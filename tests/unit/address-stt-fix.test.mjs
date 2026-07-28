import assert from "node:assert/strict";
import test from "node:test";

/** Mirror middleware portal allowlist — keep in sync with middleware.ts */
const portalPublicPrefixes = [
  "/r/",
  "/intake/",
  "/portal",
  "/agreement-offer/",
  "/api/intake-link/",
  "/api/correction/",
  "/api/agreement-offer/",
  "/api/places/",
];

function isPortalPathAllowed(pathname) {
  return (
    portalPublicPrefixes.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    Boolean(pathname.match(/\.(ico|png|jpg|svg|webp)$/))
  );
}

test("portal allowlist includes Places autocomplete and details", () => {
  assert.equal(isPortalPathAllowed("/api/places/autocomplete"), true);
  assert.equal(isPortalPathAllowed("/api/places/details"), true);
  assert.equal(isPortalPathAllowed("/api/intake-link/demo"), true);
  assert.equal(isPortalPathAllowed("/dashboard"), false);
  assert.equal(isPortalPathAllowed("/api/shop/settings"), false);
});

test("Retell STT settings favor accurate listening", async () => {
  const { buildRetellBookingAgentPatch, RETELL_PROMPT_VERSION } = await import(
    "../../lib/retell-agent-settings.ts"
  );
  const patch = buildRetellBookingAgentPatch();
  assert.equal(patch.stt_mode, "accurate");
  assert.equal(patch.denoising_mode, "noise-cancellation");
  assert.ok(Number(patch.interruption_sensitivity) >= 0.25);
  assert.ok(Array.isArray(patch.boosted_keywords));
  assert.ok(patch.boosted_keywords.includes("street"));
  assert.ok(patch.boosted_keywords.includes("sewage backup"));
  assert.match(RETELL_PROMPT_VERSION, /phone-clarity-v39|human-natural-voice-v38|clear-fast-voice-v37|clear-fast-voice-v36|clear-fast-voice-v35|clear-fast-voice-v34|quote-chase-clear-voice-v32|channel-menu-clear-voice|hybrid-address|accurate-stt/);
});
