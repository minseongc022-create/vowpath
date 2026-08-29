import test from "node:test";
import assert from "node:assert/strict";

// ─────────────────────────────────────────────────────────────
// 실제로 있었던 구멍: 회원가입이 누구에게나 열려 있었다.
// 자비스의 저장소는 가맹점별로 나뉘지 않은 **하나의 전역 상태**라,
// 아무나 가입만 하면 사장님의 대화·목표·전화번호·연동 상태를 그대로 보고
// 설정까지 바꿀 수 있었다.
//
// 새 로그인(app/api/jarvis/login)은 회원가입 자체가 없고, 소유자 이메일이
// 아니면 통과하지 못한다. 이 테스트는 그 문이 계속 잠겨 있는지 본다.
// ─────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_APP_URL = "https://effiroad.com";
process.env.TOSS_SHOP_OWNER_EMAILS = "owner@effiroad.com";

function req(body) {
  return new Request("https://effiroad.com/api/jarvis/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://effiroad.com",
    },
    body: JSON.stringify(body),
  });
}

test("소유자가 아닌 이메일은 로그인하지 못한다", async () => {
  const { POST } = await import("../../app/api/jarvis/login/route.ts");
  const res = await POST(req({ email: "stranger@example.com", password: "whatever123" }));
  assert.equal(res.status, 401);
});

test("소유자가 아닌 이메일에 계정 존재 여부를 흘리지 않는다", async () => {
  const { POST } = await import("../../app/api/jarvis/login/route.ts");
  const stranger = await POST(req({ email: "stranger@example.com", password: "x1" }));
  const owner = await POST(req({ email: "owner@effiroad.com", password: "wrong-password" }));

  // 둘 다 같은 문구여야 한다 — 다르면 어떤 이메일이 존재하는지 알려주는 셈이다
  const a = await stranger.json();
  const b = await owner.json();
  assert.equal(stranger.status, 401);
  assert.equal(owner.status, 401);
  assert.equal(a.error, b.error, "실패 문구가 다르면 계정 존재 여부가 샌다");
});

test("회원가입 경로가 아예 없다 — mode를 보내도 계정이 안 만들어진다", async () => {
  const { POST } = await import("../../app/api/jarvis/login/route.ts");
  const res = await POST(
    req({ email: "newbie@example.com", password: "pw123456", mode: "signup", name: "새사람" }),
  );
  assert.equal(res.status, 401, "mode:signup은 무시되고 소유자 검사에서 막혀야 한다");
});

test("이메일이나 비밀번호가 비면 400", async () => {
  const { POST } = await import("../../app/api/jarvis/login/route.ts");
  assert.equal((await POST(req({ email: "", password: "x" }))).status, 400);
  assert.equal((await POST(req({ email: "owner@effiroad.com", password: "" }))).status, 400);
});
