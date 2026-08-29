import test from "node:test";
import assert from "node:assert/strict";

// ─────────────────────────────────────────────────────────────
// 실제로 발견된 두 번째 구멍: /api/toss-shop/auth/connect는 인증 없이
// 누구나 부를 수 있었다. Toss 키만 있으면(useServerKeys: true로 우리
// 서버의 진짜 키를 그대로 가져다 쓰는 것도 가능했다) 새 계정과 세션이
// 만들어졌다. 계정 감사에서 사장님 본인 계정보다 먼저 만들어진 낯선
// 계정(seller_thxs94nk@connect.effiroad.local)이 실제로 발견됐다.
// ─────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_APP_URL = "https://effiroad.com";

function req(body) {
  return new Request("https://effiroad.com/api/toss-shop/auth/connect", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://effiroad.com",
    },
    body: JSON.stringify(body),
  });
}

test("로그인 세션 없이 Toss 키를 보내도 계정이 만들어지지 않는다", async () => {
  const { POST } = await import("../../app/api/toss-shop/auth/connect/route.ts");
  const res = await POST(req({ accessKey: "fake-access", secretKey: "fake-secret" }));
  assert.equal(res.status, 401);
});

test("useServerKeys(서버의 진짜 키 재사용)도 세션 없이는 거절된다 — 가장 위험한 경로", async () => {
  const { POST } = await import("../../app/api/toss-shop/auth/connect/route.ts");
  const res = await POST(req({ useServerKeys: true }));
  assert.equal(res.status, 401);
});
