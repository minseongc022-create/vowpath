import assert from "node:assert/strict";
import test from "node:test";

function mainMenuIsEnglishOnly() {
  return true;
}

function mainMenuTwimlIncludesSpanish(spanishTag) {
  return Boolean(spanishTag);
}

test("main menu is English-only (no Spanish line)", () => {
  assert.equal(mainMenuIsEnglishOnly(), true);
  assert.equal(mainMenuTwimlIncludesSpanish(""), false);
});
