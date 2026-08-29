import test from "node:test";
import assert from "node:assert/strict";

// ─────────────────────────────────────────────────────────────
// 실제로 발견된 사고: 회원가입이 누구에게나 열려 있었고, 자비스 저장소는
// 가맹점 구분 없는 전역 상태였다. 로그인만 되면 사장님의 대화·목표·
// 전화번호·연동 상태를 그대로 보고 바꿀 수 있었다. isOwnerSession이
// 유일한 방어선이라 이 함수 하나를 정확히 검증한다.
// ─────────────────────────────────────────────────────────────

test("소유자 이메일이 아니면 세션이 있어도 거절한다", async () => {
  process.env.TOSS_SHOP_OWNER_EMAILS = "owner@example.com";
  const { isOwnerSession } = await import("../../jarvis/core/access.ts?t=" + Date.now());
  assert.equal(
    isOwnerSession({ sub: "s1", email: "stranger@example.com", name: "누구", merchantId: "m1" }),
    false,
    "다른 사람이 회원가입만 해도 통과하면 안 된다",
  );
});

test("소유자 이메일이면 통과한다", async () => {
  process.env.TOSS_SHOP_OWNER_EMAILS = "owner@example.com";
  const { isOwnerSession } = await import("../../jarvis/core/access.ts?t=" + (Date.now() + 1));
  assert.equal(
    isOwnerSession({ sub: "s1", email: "owner@example.com", name: "사장님", merchantId: "m1" }),
    true,
  );
});

test("이메일 대소문자가 달라도 소유자로 인식한다", async () => {
  process.env.TOSS_SHOP_OWNER_EMAILS = "Owner@Example.com";
  const { isOwnerSession } = await import("../../jarvis/core/access.ts?t=" + (Date.now() + 2));
  assert.equal(
    isOwnerSession({ sub: "s1", email: "owner@example.com", name: "사장님", merchantId: "m1" }),
    true,
  );
});

test("세션이 아예 없으면 거절한다", async () => {
  process.env.TOSS_SHOP_OWNER_EMAILS = "owner@example.com";
  const { isOwnerSession } = await import("../../jarvis/core/access.ts?t=" + (Date.now() + 3));
  assert.equal(isOwnerSession(null), false);
});

test("소유자 이메일 환경변수가 비어 있으면(설정 누락) 아무도 통과하지 못한다 — fail-closed", async () => {
  delete process.env.TOSS_SHOP_OWNER_EMAILS;
  const { isOwnerSession } = await import("../../jarvis/core/access.ts?t=" + (Date.now() + 4));
  assert.equal(
    isOwnerSession({ sub: "s1", email: "anyone@example.com", name: "누구", merchantId: "m1" }),
    false,
    "설정이 비어서 검사를 못 하면 통과가 아니라 거절이어야 한다",
  );
});
