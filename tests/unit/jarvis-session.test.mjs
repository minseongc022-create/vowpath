import test from "node:test";
import assert from "node:assert/strict";

// ─────────────────────────────────────────────────────────────
// 세션·소유자 판별은 자비스가 옛 toss-shop에서 떼어와 자기 안에 둔 것이다.
// 옛 로그인이 `toss-shop/lib/store.ts`(2,876줄)를 거치는 바람에 비밀번호
// 한 번 확인하려고 옛 엔진 106개 파일이 딸려오던 구조를 끊은 결과다.
//
// 여기서 지키는 것 두 가지:
//   1. 쿠키 이름이 안 바뀌었는가 — 바뀌면 지금 로그인된 세션이 전부 끊긴다
//   2. 소유자가 아니면 통과하지 못하는가 (설정이 비면 전부 막힌다)
// ─────────────────────────────────────────────────────────────

process.env.AUTH_SECRET = "test-only-secret-at-least-32-chars-long";

test("쿠키 이름이 옛 것과 같다 — 바뀌면 로그인된 세션이 전부 끊긴다", async () => {
  const { JARVIS_SESSION_COOKIE } = await import("../../jarvis/core/session.ts");
  assert.equal(
    JARVIS_SESSION_COOKIE,
    "toss_shop_session",
    "이름을 바꾸려면 사장님이 다시 로그인해야 한다는 걸 알고 바꿔야 한다",
  );
});

test("발급한 토큰을 그대로 다시 읽을 수 있다", async () => {
  const { createJarvisSessionToken, verifyJarvisSessionToken } = await import(
    "../../jarvis/core/session.ts"
  );
  const token = await createJarvisSessionToken({
    sub: "owner@effiroad.com",
    email: "owner@effiroad.com",
    name: "사장님",
  });
  const back = await verifyJarvisSessionToken(token);
  assert.equal(back?.email, "owner@effiroad.com");
});

test("서명이 틀린 토큰은 통과하지 못한다", async () => {
  const { verifyJarvisSessionToken } = await import("../../jarvis/core/session.ts");
  assert.equal(await verifyJarvisSessionToken("not-a-real-token"), null);
});

test("소유자 이메일만 통과한다 — 대소문자·공백은 무시", async () => {
  process.env.TOSS_SHOP_OWNER_EMAILS = "owner@effiroad.com";
  const { isOwnerEmail } = await import("../../jarvis/core/access.ts");
  assert.equal(isOwnerEmail("owner@effiroad.com"), true);
  assert.equal(isOwnerEmail("  OWNER@EffiRoad.com  "), true);
  assert.equal(isOwnerEmail("stranger@example.com"), false);
});

test("소유자 설정이 비어 있으면 아무도 통과 못 한다 — 열리는 것보다 막히는 게 낫다", async () => {
  const saved = process.env.TOSS_SHOP_OWNER_EMAILS;
  process.env.TOSS_SHOP_OWNER_EMAILS = "";
  try {
    const { isOwnerEmail, isOwnerSession } = await import("../../jarvis/core/access.ts");
    assert.equal(isOwnerEmail("owner@effiroad.com"), false);
    assert.equal(isOwnerSession({ sub: "x", email: "owner@effiroad.com", name: "" }), false);
  } finally {
    process.env.TOSS_SHOP_OWNER_EMAILS = saved;
  }
});

test("세션이 없으면(null) 소유자가 아니다", async () => {
  process.env.TOSS_SHOP_OWNER_EMAILS = "owner@effiroad.com";
  const { isOwnerSession } = await import("../../jarvis/core/access.ts");
  assert.equal(isOwnerSession(null), false);
});

// ─────────────────────────────────────────────────────────────
// ★ 실제로 있던 구멍 재현
//
// effiroad.com은 예전에 미국 복원·냉난방 업체 전화를 대신 받는 AI 서비스
// 도메인이었다. 그 서비스의 세션(lib/auth-token.ts)은 자비스와 **같은
// AUTH_SECRET·같은 HS256**으로 서명하고 서로를 구분하는 표시가 없었다.
// 그래서 그 시절 가입자의 토큰을 자비스 쿠키에 그대로 넣으면 서명 검증을
// 통과했다 — 막던 건 이메일 검사 하나뿐이었다.
//
// 이 테스트는 그 토큰이 이제 구조적으로 막히는지 본다.
// ─────────────────────────────────────────────────────────────

test("옛 전화 서비스 토큰은 자비스 세션으로 통하지 않는다 — 같은 키로 서명됐어도", async () => {
  const { createSessionToken } = await import("../../lib/auth-token.ts");
  const { verifyJarvisSessionToken } = await import("../../jarvis/core/session.ts");

  // 옛 서비스가 실제로 발급하던 것과 똑같은 토큰
  const legacyToken = await createSessionToken({
    sub: "old-user-1",
    email: "someone@restoration-co.com",
    shopName: "옛 복원업체",
  });

  const asJarvis = await verifyJarvisSessionToken(legacyToken);
  assert.equal(
    asJarvis,
    null,
    "옛 서비스 토큰이 자비스 세션으로 통하면 그 시절 가입자가 자비스에 들어온다",
  );
});

test("옛 서비스 토큰이 소유자 이메일을 달고 있어도 통하지 않는다", async () => {
  // 이메일 검사에 기대지 않는다는 걸 확인한다 — 검사는 두 겹이어야 한다
  const { createSessionToken } = await import("../../lib/auth-token.ts");
  const { verifyJarvisSessionToken } = await import("../../jarvis/core/session.ts");

  const legacyToken = await createSessionToken({
    sub: "impersonator",
    email: "owner@effiroad.com",
    shopName: "x",
  });

  assert.equal(await verifyJarvisSessionToken(legacyToken), null);
});
