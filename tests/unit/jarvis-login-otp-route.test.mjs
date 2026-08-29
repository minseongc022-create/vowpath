import test from "node:test";
import assert from "node:assert/strict";

import { createPendingOtpToken, hashOtpCode, PENDING_OTP_COOKIE } from "../../jarvis/core/otp.ts";

// ─────────────────────────────────────────────────────────────
// 로그인 2단계 확인 라우트 — 비밀번호 없이 문자 코드만으로는
// 아무것도 못 하고, 코드 없이 쿠키만으로도 아무것도 못 한다.
// ─────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_APP_URL = "https://effiroad.com";
process.env.TOSS_SHOP_OWNER_EMAILS = "owner@effiroad.com";

function req({ code, cookie }) {
  const headers = { "content-type": "application/json", origin: "https://effiroad.com" };
  if (cookie) headers.cookie = cookie;
  return new Request("https://effiroad.com/api/jarvis/login/verify-otp", {
    method: "POST",
    headers,
    body: JSON.stringify({ code }),
  });
}

test("대기 쿠키가 없으면 처음부터 다시 하라고 한다", async () => {
  const { POST } = await import("../../app/api/jarvis/login/verify-otp/route.ts");
  const res = await POST(req({ code: "123456" }));
  assert.equal(res.status, 401);
});

test("6자리가 아니면 400 — 형식부터 거른다", async () => {
  const { POST } = await import("../../app/api/jarvis/login/verify-otp/route.ts");
  const res = await POST(req({ code: "12", cookie: `${PENDING_OTP_COOKIE}=x` }));
  assert.equal(res.status, 400);
});

test("★ 틀린 코드는 401 — 대기 토큰이 있어도 코드가 맞아야 한다", async () => {
  const email = "owner@effiroad.com";
  const otpHash = hashOtpCode(email, "111111");
  const token = await createPendingOtpToken({ email, otpHash });

  const { POST } = await import("../../app/api/jarvis/login/verify-otp/route.ts");
  const res = await POST(req({ code: "222222", cookie: `${PENDING_OTP_COOKIE}=${token}` }));
  assert.equal(res.status, 401);
});

test("★ 맞는 코드면 세션 쿠키를 내주고 대기 쿠키는 지운다", async () => {
  const email = "owner@effiroad.com";
  const otpHash = hashOtpCode(email, "555555");
  const token = await createPendingOtpToken({ email, otpHash });

  const { POST } = await import("../../app/api/jarvis/login/verify-otp/route.ts");
  const res = await POST(req({ code: "555555", cookie: `${PENDING_OTP_COOKIE}=${token}` }));
  assert.equal(res.status, 200);
  const setCookie = res.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /toss_shop_session=/, "실제 세션 쿠키가 나가야 한다");
});

test("소유자가 아닌 이메일로 서명된 대기 토큰은 통과 못 한다", async () => {
  const email = "stranger@example.com";
  const otpHash = hashOtpCode(email, "999999");
  const token = await createPendingOtpToken({ email, otpHash });

  const { POST } = await import("../../app/api/jarvis/login/verify-otp/route.ts");
  const res = await POST(req({ code: "999999", cookie: `${PENDING_OTP_COOKIE}=${token}` }));
  assert.equal(res.status, 401);
});
