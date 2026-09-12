import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidSelector, normalizeStep, parseSelector } from "@/vibesafe/lib/flows/steps";

test("선택자 문법을 해석한다", () => {
  assert.deepEqual(parseSelector("role:button|로그인"), { kind: "role", role: "button", name: "로그인" });
  assert.deepEqual(parseSelector("role:button"), { kind: "role", role: "button", name: null });
  assert.deepEqual(parseSelector("text:예약하기"), { kind: "text", value: "예약하기" });
  assert.deepEqual(parseSelector("css:#submit"), { kind: "css", value: "#submit" });
});

test("모르는 선택자 형식은 거절한다", () => {
  assert.equal(parseSelector("xpath://div"), null);
  assert.equal(parseSelector("그냥글자"), null);
  assert.equal(parseSelector("text:"), null);
  assert.equal(isValidSelector(null), false);
});

test("선택자가 필요한 동작에 선택자가 없으면 단계를 버린다", () => {
  assert.equal(normalizeStep({ action: "click", description: "누르기" }), null);
  assert.equal(normalizeStep({ action: "fill", selector: "깨진선택자", value: "x", description: "입력" }), null);
});

test("설명이 없는 단계는 버린다", () => {
  // 설명이 없으면 실패했을 때 사용자에게 무슨 일인지 말할 수 없다.
  assert.equal(normalizeStep({ action: "goto", value: "/x", description: "  " }), null);
});

test("알 수 없는 동작은 버린다", () => {
  assert.equal(normalizeStep({ action: "hack_database", description: "?" }), null);
});

test("wait은 상한을 씌운다", () => {
  assert.equal(normalizeStep({ action: "wait", value: "999999", description: "대기" }).value, "10000");
  assert.equal(normalizeStep({ action: "wait", value: "5", description: "대기" }).value, "100");
});

test("secretRef가 있으면 value 없이도 통과한다", () => {
  const step = normalizeStep({
    action: "fill",
    selector: "label:비밀번호",
    secretRef: "password",
    description: "비밀번호 입력",
  });
  assert.equal(step.secretRef, "password");
  assert.equal(step.value, null);
});

test("허용되지 않은 secretRef는 무시한다", () => {
  const step = normalizeStep({
    action: "fill",
    selector: "label:x",
    value: "v",
    secretRef: "admin_token",
    description: "입력",
  });
  assert.equal(step.secretRef, null);
});
