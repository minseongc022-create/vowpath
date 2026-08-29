import test from "node:test";
import assert from "node:assert/strict";

import {
  sellerPulseInternalPath,
  isRetiredDashboardPath,
} from "../../lib/seller-pulse-host.ts";

// ─────────────────────────────────────────────────────────────
// effiroad.com이 자비스를 서비스한다
// ─────────────────────────────────────────────────────────────

test("루트가 자비스 대화 화면으로 간다", () => {
  assert.equal(sellerPulseInternalPath("/"), "/jarvis");
});

test("검수·설정이 자비스 화면으로 간다", () => {
  assert.equal(sellerPulseInternalPath("/review"), "/jarvis/review");
  assert.equal(sellerPulseInternalPath("/settings"), "/jarvis/settings");
});

test("로그인은 기존 것을 그대로 쓴다 — 세션은 외부 계약이라 다시 만들지 않는다", () => {
  assert.equal(sellerPulseInternalPath("/login"), "/toss-shop/login");
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
