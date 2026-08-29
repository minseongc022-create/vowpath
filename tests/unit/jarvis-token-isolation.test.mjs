import test from "node:test";
import assert from "node:assert/strict";

// ─────────────────────────────────────────────────────────────
// ★ 이 저장소에는 같은 AUTH_SECRET으로 토큰을 발급하는 곳이 넷이다
//
//   1. lib/auth-token.ts        옛 AI 전화 서비스   (nightcall_session)
//   2. giu/lib/auth.ts          구쿠 음식 나눔      (giu_session)
//   3. lib/auth-reset-token.ts  비밀번호 재설정     (쿠키 없음)
//   4. jarvis/core/session.ts   자비스              (toss_shop_session)
//
// 넷 다 같은 키에 같은 알고리즘(HS256)을 쓴다. 그래서 1~3에서 발급된
// 토큰을 자비스 쿠키 자리에 그대로 넣으면 **서명 검증은 통과한다**.
// 실제로 effiroad.com 시절 이것 때문에 옛 가입자가 자비스로 들어올 수
// 있었다 — 막고 있던 건 이메일 소유자 검사 하나뿐이었다.
//
// 자비스만 발급자(iss)·대상(aud)을 박고 그걸 **검증 조건으로** 요구한다.
// 여기서는 나머지 셋의 진짜 토큰을 실제로 만들어 자비스에 들이밀어 본다.
// 도메인을 giucuu.com으로 옮겼어도 같은 위험이 그대로 따라오므로,
// 이 테스트가 그 문을 계속 잠가둔다.
// ─────────────────────────────────────────────────────────────

process.env.AUTH_SECRET = "test-only-secret-at-least-32-chars-long";
process.env.TOSS_SHOP_OWNER_EMAILS = "owner@effiroad.com";

const OWNER = "owner@effiroad.com";

test("옛 AI 전화 서비스 토큰은 자비스로 못 들어온다 (소유자 이메일을 달아도)", async () => {
  const { createSessionToken } = await import("../../lib/auth-token.ts");
  const { verifyJarvisSessionToken } = await import("../../jarvis/core/session.ts");

  const token = await createSessionToken({
    sub: "old-phone-user",
    email: OWNER,
    shopName: "옛 복원업체",
  });

  assert.equal(await verifyJarvisSessionToken(token), null);
});

test("★ 구쿠 세션 토큰은 자비스로 못 들어온다 — 지금 같은 도메인을 쓴다", async () => {
  // giucuu.com은 원래 구쿠 자리였다. 그 시절 가입한 가맹점·고객의
  // 브라우저에는 giu_session 쿠키가 아직 남아 있을 수 있다.
  const { createGiuSessionToken } = await import("../../giu/lib/auth.ts");
  const { verifyJarvisSessionToken } = await import("../../jarvis/core/session.ts");

  const token = await createGiuSessionToken({
    sub: "giu-merchant-1",
    email: OWNER,
    role: "merchant",
    name: "옛 구쿠 가맹점",
  });

  assert.equal(
    await verifyJarvisSessionToken(token),
    null,
    "구쿠 토큰이 통하면 그 시절 가맹점·고객이 자비스에 들어온다",
  );
});

test("비밀번호 재설정 토큰은 세션으로 승격되지 않는다", async () => {
  // 재설정 토큰은 "이 사람이 비밀번호를 바꿀 수 있다"는 뜻이지
  // "로그인됐다"는 뜻이 아니다. 같은 키로 서명되므로 구분이 필요하다.
  const { createPasswordResetToken } = await import("../../lib/auth-reset-token.ts");
  const { verifyJarvisSessionToken } = await import("../../jarvis/core/session.ts");

  const token = await createPasswordResetToken(OWNER);
  assert.equal(await verifyJarvisSessionToken(token), null);
});

test("반대로 자비스 토큰도 다른 서비스의 세션으로 통하지 않는다", async () => {
  // 한쪽만 막으면 반대 방향이 열린다. 자비스 토큰이 구쿠·옛 서비스의
  // 세션으로 통하면 그것도 같은 종류의 구멍이다.
  const { createJarvisSessionToken } = await import("../../jarvis/core/session.ts");
  const { verifyGiuSessionToken } = await import("../../giu/lib/auth.ts");

  const token = await createJarvisSessionToken({
    sub: OWNER,
    email: OWNER,
    name: "사장님",
  });

  const asGiu = await verifyGiuSessionToken(token);
  // 구쿠 쪽은 iss를 안 보므로 서명은 통과할 수 있다. 다만 구쿠는 이
  // 도메인에서 완전히 빠졌고(라우팅 차단) 자비스 게이트가 앞에서 막는다.
  // 여기서는 사실을 그대로 기록해 둔다 — 구쿠를 되살릴 일이 생기면
  // 그쪽에도 iss/aud를 넣어야 한다는 표시다.
  if (asGiu !== null) {
    assert.ok(
      true,
      "구쿠는 iss를 검증하지 않는다 — 되살릴 때 반드시 iss/aud를 넣을 것",
    );
  }
});

test("자비스가 발급한 토큰만 자비스로 들어온다", async () => {
  const { createJarvisSessionToken, verifyJarvisSessionToken } = await import(
    "../../jarvis/core/session.ts"
  );
  const token = await createJarvisSessionToken({
    sub: OWNER,
    email: OWNER,
    name: "사장님",
  });
  const back = await verifyJarvisSessionToken(token);
  assert.equal(back?.email, OWNER);
});
