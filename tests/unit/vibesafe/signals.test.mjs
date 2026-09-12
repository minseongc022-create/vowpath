import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeFailure } from "@/vibesafe/lib/signals";

/**
 * 교차 고객 탐지는 "같은 종류의 실패"를 같은 지문으로 묶어야 작동한다.
 * 지문이 전부 다르면 집계가 안 되고, 너무 뭉뚱그리면 엉뚱한 것끼리 묶인다.
 */

test("구체적인 값이 달라도 같은 종류면 같은 지문이 된다", () => {
  const a = normalizeFailure({
    errorMessage: 'locator.waitFor: Timeout 15000ms exceeded waiting for getByLabel("이메일")',
    failedStepDescription: null,
  });
  const b = normalizeFailure({
    errorMessage: 'locator.waitFor: Timeout 30000ms exceeded waiting for getByLabel("비밀번호")',
    failedStepDescription: null,
  });
  assert.equal(a.signature, b.signature, "숫자·문자열만 다른데 지문이 갈렸다");
});

test("종류가 다르면 지문도 다르다", () => {
  const timeout = normalizeFailure({ errorMessage: "Timeout 15000ms exceeded", failedStepDescription: null });
  const network = normalizeFailure({ errorMessage: "net::ERR_CONNECTION_REFUSED", failedStepDescription: null });
  assert.notEqual(timeout.signature, network.signature);
});

test("오류 종류를 알아본다", () => {
  const cases = [
    ["Timeout 15000ms exceeded", "timeout"],
    ["net::ERR_NAME_NOT_RESOLVED", "network"],
    ["Internal Server Error 500", "server_error"],
    ["401 Unauthorized", "auth_error"],
    ['relation "users" does not exist', "database"],
    ["waiting for locator to be visible", "element_missing"],
  ];
  for (const [message, expected] of cases) {
    assert.equal(
      normalizeFailure({ errorMessage: message, failedStepDescription: null }).category,
      expected,
      `"${message}" → ${expected} 이어야 한다`,
    );
  }
});

test("주소와 해시는 지문에 영향을 주지 않는다", () => {
  const a = normalizeFailure({
    errorMessage: "failed at https://app-a.vercel.app/login (commit abc123def456)",
    failedStepDescription: null,
  });
  const b = normalizeFailure({
    errorMessage: "failed at https://app-b.vercel.app/signup (commit fff999aaa888)",
    failedStepDescription: null,
  });
  assert.equal(a.signature, b.signature, "앱마다 주소가 다른데 지문이 갈리면 집계가 안 된다");
});

test("오류 메시지가 없으면 단계 설명으로 지문을 만든다", () => {
  const result = normalizeFailure({ errorMessage: null, failedStepDescription: "로그인 버튼 누르기" });
  assert.ok(result.signature.length > 0);
});

test("지문에 원본 값이 남지 않는다", () => {
  // 지문은 해시라 원본을 복원할 수 없어야 한다.
  const result = normalizeFailure({
    errorMessage: "token sk-secret-abcdef123456 rejected",
    failedStepDescription: null,
  });
  assert.ok(!result.signature.includes("sk-secret"));
  assert.match(result.signature, /^[0-9a-f]{32}$/);
});
