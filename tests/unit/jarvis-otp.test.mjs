import test from "node:test";
import assert from "node:assert/strict";

import {
  createPendingOtpToken,
  generateOtpCode,
  hashOtpCode,
  otpHashMatches,
  verifyPendingOtpToken,
} from "../../jarvis/core/otp.ts";

// ─────────────────────────────────────────────────────────────
// ★ "만약 접근하더라도 절대 못 들어오게" — 로그인 2단계
//
// 비밀번호 하나만으로 들어오는 구조는 그 비밀번호가 새면 끝이다. 여기서
// 지키는 것: 비밀번호를 맞혀도, 사장님 휴대폰으로 간 코드를 모르면
// 세션이 절대 안 나간다. 이 파일은 그 코드가 어떻게 만들어지고,
// 저장되고(원문이 아니라 해시로), 비교되는지를 잰다.
// ─────────────────────────────────────────────────────────────

test("6자리 숫자를 낸다 — 0으로 시작해도 길이가 유지된다", () => {
  for (let i = 0; i < 50; i++) {
    const code = generateOtpCode();
    assert.match(code, /^\d{6}$/);
  }
});

test("★ 같은 코드도 이메일이 다르면 해시가 다르다 — 한 사람 코드가 다른 사람 걸로 안 맞는다", () => {
  const a = hashOtpCode("owner@example.com", "123456");
  const b = hashOtpCode("other@example.com", "123456");
  assert.notEqual(a, b);
});

test("같은 이메일·같은 코드는 항상 같은 해시다", () => {
  const a = hashOtpCode("owner@example.com", "123456");
  const b = hashOtpCode("owner@example.com", "123456");
  assert.equal(a, b);
});

test("코드가 한 글자만 달라도 해시가 다르다", () => {
  const a = hashOtpCode("owner@example.com", "123456");
  const b = hashOtpCode("owner@example.com", "123457");
  assert.notEqual(a, b);
});

test("otpHashMatches: 같은 해시만 통과시킨다", () => {
  const h = hashOtpCode("owner@example.com", "123456");
  assert.equal(otpHashMatches(h, h), true);
  assert.equal(otpHashMatches(h, hashOtpCode("owner@example.com", "654321")), false);
});

test("길이가 다른 값은 즉시 거절한다 — 비교 중 예외로 새지 않는다", () => {
  assert.equal(otpHashMatches("ab", "abcdef"), false);
});

test("★ 서명된 토큰만 통과한다 — 위조한 토큰은 걸린다", async () => {
  const token = await createPendingOtpToken({ email: "owner@example.com", otpHash: "deadbeef" });
  const pending = await verifyPendingOtpToken(token);
  assert.ok(pending);
  assert.equal(pending.email, "owner@example.com");
  assert.equal(pending.otpHash, "deadbeef");

  assert.equal(await verifyPendingOtpToken(token + "x"), null);
  assert.equal(await verifyPendingOtpToken("not-a-real-token"), null);
});

test("실제 로그인 순서를 그대로 따라간다 — 발송한 코드만 통과하고 다른 코드는 막힌다", async () => {
  const email = "owner@example.com";
  const realCode = generateOtpCode();
  const otpHash = hashOtpCode(email, realCode);
  const token = await createPendingOtpToken({ email, otpHash });

  const pending = await verifyPendingOtpToken(token);
  assert.ok(pending);

  // 사장님이 실제로 받은 코드
  assert.equal(otpHashMatches(hashOtpCode(pending.email, realCode), pending.otpHash), true);
  // 남이 아무 숫자나 넣어본 경우
  assert.equal(otpHashMatches(hashOtpCode(pending.email, "000000"), pending.otpHash), false);
});
