import test from "node:test";
import assert from "node:assert/strict";

// ─────────────────────────────────────────────────────────────
// 로그인 라우트 자체가 첫 번째 방어선이다. 소유자가 아니면 계정 생성이든
// 로그인 시도든 store를 건드리기도 전에 여기서 막혀야 한다 — 그래야
// "이미 사용 중인 이메일입니다" 같은 응답으로 계정 존재 여부가 새지 않는다.
// ─────────────────────────────────────────────────────────────

process.env.TOSS_SHOP_OWNER_EMAILS = "owner@example.com";
process.env.NEXT_PUBLIC_APP_URL = "https://effiroad.com";

function req(body) {
  return new Request("https://effiroad.com/api/toss-shop/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://effiroad.com",
    },
    body: JSON.stringify(body),
  });
}

test("소유자가 아닌 이메일의 회원가입 시도는 계정을 만들기 전에 거절된다", async () => {
  const { POST } = await import("../../app/api/toss-shop/auth/login/route.ts");
  const res = await POST(req({ mode: "signup", email: "stranger@example.com", password: "aaaaaaaa" }));
  assert.equal(res.status, 401);
  const body = await res.json();
  // "이미 사용 중인 이메일입니다" 같은 계정-존재 힌트를 주면 안 된다 —
  // 로그인 실패와 똑같은 문구여야 계정 존재 여부가 새지 않는다
  assert.equal(body.error, "이메일 또는 비밀번호가 올바르지 않습니다.");
});

test("소유자가 아닌 이메일의 로그인 시도도 같은 이유로 거절된다", async () => {
  const { POST } = await import("../../app/api/toss-shop/auth/login/route.ts");
  const res = await POST(req({ mode: "login", email: "stranger@example.com", password: "whatever" }));
  assert.equal(res.status, 401);
});

test("소유자 이메일 대소문자를 바꿔도 거절 여부가 안 바뀐다 — 우회 경로가 없다", async () => {
  const { POST } = await import("../../app/api/toss-shop/auth/login/route.ts");
  const res = await POST(
    req({ mode: "signup", email: "STRANGER@EXAMPLE.COM", password: "aaaaaaaa" }),
  );
  assert.equal(res.status, 401);
});
