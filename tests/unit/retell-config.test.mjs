import assert from "node:assert/strict";
import test from "node:test";

function shouldRetellAnswerAllCalls(env) {
  const apiKey = env.RETELL_API_KEY?.trim();
  if (!apiKey) return false;
  const skip = env.RETELL_SKIP_DTMF_MENU?.trim().toLowerCase();
  if (skip === "true" || skip === "1" || skip === "yes") return true;
  return false;
}

test("shouldRetellAnswerAllCalls: default is menu first when Retell configured", () => {
  assert.equal(shouldRetellAnswerAllCalls({ RETELL_API_KEY: "key_test" }), false);
});

test("shouldRetellAnswerAllCalls: skip menu when RETELL_SKIP_DTMF_MENU=true", () => {
  assert.equal(
    shouldRetellAnswerAllCalls({ RETELL_API_KEY: "key_test", RETELL_SKIP_DTMF_MENU: "true" }),
    true,
  );
});

test("shouldRetellAnswerAllCalls: false when Retell not configured", () => {
  assert.equal(shouldRetellAnswerAllCalls({}), false);
});
