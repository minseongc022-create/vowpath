import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveTossConfig,
  isTossConfigured,
  tossConfigFromEnv,
  maskTossKey,
} from "../../jarvis/core/toss-config.ts";

// ─────────────────────────────────────────────────────────────
// 실제로 있던 버그: 서버에 토스 키가 멀쩡히 있는데 설정 화면에는
// 계속 "토스쇼핑 미연결"로 떴다.
//
// 도매꾹은 환경변수와 저장소를 **둘 다** 보는데, 토스는 저장소만 보고
// 있었다. 같은 판단을 두 군데서 다르게 하면 반드시 어긋난다.
// ─────────────────────────────────────────────────────────────

function clearEnv() {
  delete process.env.TOSS_SHOPPING_ACCESS_KEY;
  delete process.env.TOSS_SHOPPING_SECRET_KEY;
  delete process.env.TOSS_SHOPPING_SANDBOX;
}

test("★ 환경변수에만 키가 있어도 연결된 것으로 본다 — 이게 미연결로 뜨던 버그", () => {
  clearEnv();
  process.env.TOSS_SHOPPING_ACCESS_KEY = "live-access-key-1234";
  process.env.TOSS_SHOPPING_SECRET_KEY = "live-secret-key-5678";
  try {
    assert.equal(isTossConfigured({}), true, "서버에 키가 있는데 미연결로 뜨면 안 된다");
    assert.equal(resolveTossConfig({})?.fromEnv, true);
  } finally {
    clearEnv();
  }
});

test("키가 어디에도 없으면 미연결이다", () => {
  clearEnv();
  assert.equal(isTossConfigured({}), false);
  assert.equal(tossConfigFromEnv(), null);
});

test("한쪽 키만 있으면 연결로 보지 않는다 — 반쪽으로는 호출이 안 된다", () => {
  clearEnv();
  process.env.TOSS_SHOPPING_ACCESS_KEY = "only-access";
  try {
    assert.equal(isTossConfigured({}), false);
    assert.equal(isTossConfigured({ tossAccessKey: "a" }), false, "시크릿이 없다");
    assert.equal(isTossConfigured({ tossSecretKey: "b" }), false, "액세스가 없다");
  } finally {
    clearEnv();
  }
});

test("화면에서 넣은 키가 환경변수보다 우선한다 — 방금 넣은 게 최신이다", () => {
  clearEnv();
  process.env.TOSS_SHOPPING_ACCESS_KEY = "env-access";
  process.env.TOSS_SHOPPING_SECRET_KEY = "env-secret";
  try {
    const cfg = resolveTossConfig({ tossAccessKey: "ui-access", tossSecretKey: "ui-secret" });
    assert.equal(cfg?.accessKey, "ui-access");
    assert.equal(cfg?.fromEnv, false);
  } finally {
    clearEnv();
  }
});

test("샌드박스 여부가 그대로 전달된다 — 테스트 모드인 걸 화면에서 알아야 한다", () => {
  clearEnv();
  process.env.TOSS_SHOPPING_ACCESS_KEY = "a1234567";
  process.env.TOSS_SHOPPING_SECRET_KEY = "b1234567";
  process.env.TOSS_SHOPPING_SANDBOX = "1";
  try {
    assert.equal(resolveTossConfig({})?.sandbox, true);
  } finally {
    clearEnv();
  }
});

test("키는 절대 그대로 안 나간다 — 가려서만 보여준다", () => {
  const masked = maskTossKey("live_1234567890abcdef");
  assert.ok(masked);
  assert.ok(!masked.includes("567890abc"), "가운데가 그대로 나오면 안 된다");
  assert.equal(maskTossKey(undefined), null);
  assert.equal(maskTossKey("short"), "••••••••", "짧아도 원문이 보이면 안 된다");
});
