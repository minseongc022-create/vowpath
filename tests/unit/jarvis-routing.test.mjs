import test from "node:test";
import assert from "node:assert/strict";

import {
  sellerPulseInternalPath,
  isRetiredDashboardPath,
  isLegacyEffiroadUiPath,
} from "../../lib/seller-pulse-host.ts";

// ─────────────────────────────────────────────────────────────
// effiroad.com이 자비스를 서비스한다
// ─────────────────────────────────────────────────────────────

test("루트가 자비스 대화 화면으로 간다", () => {
  assert.equal(sellerPulseInternalPath("/"), "/jarvis");
});

test("검수·설정·반품이 자비스 화면으로 간다", () => {
  assert.equal(sellerPulseInternalPath("/review"), "/jarvis/review");
  assert.equal(sellerPulseInternalPath("/settings"), "/jarvis/settings");
  assert.equal(sellerPulseInternalPath("/returns"), "/jarvis/returns");
});

// ★ 실제 사고 재현: 반품 화면을 만들면서 이 매핑을 빠뜨렸다. 그러면
// 로그인 여부와 무관하게 메뉴의 「반품」을 눌러도 늘 빈 흰 화면만 떴다 —
// 물리적 파일은 있는데 미들웨어가 거기로 보내는 길 자체가 없었다.
test("★ /returns가 안 뚫려 있으면 늘 빈 화면이 뜬다 — 이 매핑이 그 사고를 막는다", () => {
  assert.notEqual(sellerPulseInternalPath("/returns"), null);
  assert.equal(isLegacyEffiroadUiPath("/returns"), false, "옛 UI 차단 목록에도 없어야 한다");
});

test("로그인은 자비스 화면으로 간다 — 옛 엔진을 안 거친다", () => {
  assert.equal(sellerPulseInternalPath("/login"), "/jarvis-login");
});

test("로그인 화면은 자비스 layout 아래가 아니다 — 무한 루프 방지", () => {
  // app/(jarvis)/jarvis/layout.tsx가 소유자가 아니면 로그인으로 돌려보낸다.
  // 로그인 화면이 `/jarvis/...` 아래 있으면 로그인하러 갔다가 다시 로그인으로
  // 튕기는 무한 루프가 된다. 그래서 형제 경로여야 한다.
  const login = sellerPulseInternalPath("/login");
  assert.ok(login && !login.startsWith("/jarvis/"), `${login}은 자비스 layout에 걸린다`);
});

test("옛 대시보드 주소는 은퇴 대상으로 잡힌다", () => {
  // 문자로 받아둔 옛 링크가 404가 뜨면 서비스가 깨진 줄 알게 된다
  assert.equal(isRetiredDashboardPath("/dashboard"), true);
  assert.equal(isRetiredDashboardPath("/dashboard/review"), true);
  assert.equal(isRetiredDashboardPath("/dashboard/settings"), true);
});

test("옛 대시보드는 더 이상 파일 경로로 매핑되지 않는다", () => {
  // 매핑이 남아 있으면 2,700만원짜리 초안이 있는 옛 화면이 계속 열린다
  assert.equal(sellerPulseInternalPath("/dashboard/review"), null);
  assert.equal(sellerPulseInternalPath("/dashboard"), null);
});

test("자비스와 무관한 주소는 건드리지 않는다", () => {
  assert.equal(isRetiredDashboardPath("/review"), false);
  assert.equal(isRetiredDashboardPath("/"), false);
  assert.equal(sellerPulseInternalPath("/pricing"), null);
});

// ─────────────────────────────────────────────────────────────
// 실제 사고 재현: /settings가 옛 UI 차단 목록에도 들어 있어서
// sellerPulseInternalPath까지 가보지도 못하고 미들웨어가 404로 막았다.
// 배포는 됐는데 설정 화면만 안 뜨는 형태로 나타났다.
// ─────────────────────────────────────────────────────────────

test("/settings는 은퇴한 UI 목록에 없다 — 자비스 설정 화면이라 막히면 안 된다", () => {
  assert.equal(
    isLegacyEffiroadUiPath("/settings"),
    false,
    "/settings가 이 목록에 있으면 sellerPulseInternalPath보다 먼저 404로 막힌다",
  );
});

test("apex 미들웨어 순서상 /settings가 실제로 자비스 화면에 닿는다", () => {
  // isLegacyEffiroadUiPath를 먼저 통과해야 sellerPulseInternalPath가 뜻이 있다.
  // 이 순서를 흉내내 두 조건을 함께 확인한다 — 실제 미들웨어 로직과 어긋나면
  // 이 테스트가 통과해도 배포에서는 여전히 막힐 수 있으므로 순서 자체를 명시한다.
  assert.equal(isLegacyEffiroadUiPath("/settings"), false);
  assert.equal(sellerPulseInternalPath("/settings"), "/jarvis/settings");
});
