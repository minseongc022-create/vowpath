import test from "node:test";
import assert from "node:assert/strict";

import { isPublicJarvisPath } from "../../jarvis/core/gate.ts";

// ─────────────────────────────────────────────────────────────
// 문 — 사장님이 아니면 로그인 화면 말고는 아무것도 못 본다.
//
// 미들웨어가 라우트에 닿기 전에 막는다. 화면·API마다 소유자 검사가
// 이미 있지만, 검사를 빠뜨린 라우트가 하나만 생겨도 자비스 전체가
// 뚫린다 — 저장소가 가맹점별로 안 나뉜 전역 상태라 그렇다.
// ─────────────────────────────────────────────────────────────

test("자비스 화면·API는 로그인 없이 열리지 않는다", () => {
  for (const p of [
    "/",
    "/review",
    "/settings",
    "/api/jarvis/chat",
    "/api/jarvis/drafts",
    "/api/jarvis/settings",
  ]) {
    assert.equal(isPublicJarvisPath(p), false, `${p}가 열려 있으면 아무나 들어온다`);
  }
});

test("로그인에 필요한 것만 열려 있다", () => {
  assert.equal(isPublicJarvisPath("/login"), true);
  assert.equal(isPublicJarvisPath("/api/jarvis/login"), true);
});

test("기계가 부르는 곳은 열려 있다 — 각자 비밀키·서명으로 스스로 막는다", () => {
  assert.equal(isPublicJarvisPath("/api/jarvis/cron"), true);
  assert.equal(isPublicJarvisPath("/api/cron/tech-dispatch"), true);
  assert.equal(isPublicJarvisPath("/api/lemon-squeezy/webhook"), true);
});

test("★ 구쿠 예약 만료 크론이 살아 있다 — 막으면 결제 안 된 예약이 안 풀린다", () => {
  // 이 크론은 giucuu.com이 아니라 effiroad.com으로 들어온다
  // (config/cron.schedule.json의 externalCrons). 막으면 구쿠의 재고가 잠긴다.
  assert.equal(isPublicJarvisPath("/api/cron/giu-reservation-expiry"), true);
});

test("정적 파일은 열려 있다 — 아니면 로그인 화면이 안 그려진다", () => {
  assert.equal(isPublicJarvisPath("/_next/static/chunk.js"), true);
  assert.equal(isPublicJarvisPath("/favicon.ico"), true);
});

test("옛 전화 서비스 시절 주소도 막힌다 — 그 시절 링크로 못 들어온다", () => {
  // effiroad.com은 예전에 미국 복원·냉난방 업체 전화를 대신 받던 자리였다.
  for (const p of ["/dashboard", "/r/abc123", "/intake/xyz", "/portal", "/onboarding"]) {
    assert.equal(isPublicJarvisPath(p), false, `${p}로 옛 사용자가 들어오면 안 된다`);
  }
});

test("모르는 경로는 기본이 '막힘'이다 — 빠뜨려서 열리는 일이 없게", () => {
  for (const p of ["/api/some-new-route", "/whatever", "/admin", "/api/admin/anything"]) {
    assert.equal(isPublicJarvisPath(p), false, `${p}가 기본으로 열리면 안 된다`);
  }
});

test("로그인 경로를 접두어로 흉내 내도 안 열린다", () => {
  // "/login"으로 시작한다고 다 열어주면 /login-bypass 같은 게 뚫린다
  assert.equal(isPublicJarvisPath("/login-bypass"), false);
  assert.equal(isPublicJarvisPath("/api/jarvis/login-x"), false);
});

// ─────────────────────────────────────────────────────────────
// 구쿠 격리 — giucuu.com은 이제 자비스 자리다.
//
// 구쿠 코드 파일은 되살릴 수 있게 남겨뒀지만 라우팅은 완전히 끊었다.
// 호스트별 분기만으로는 부족하다: 배포 자체의 주소(*.vercel.app)로
// 들어오면 자비스 분기도 effiroad 분기도 안 걸려서 /giu·/api/giu가
// 그대로 열린다. 그래서 경로로 막는다.
// ─────────────────────────────────────────────────────────────

test("구쿠 경로는 자비스 게이트에서도 공개가 아니다", () => {
  for (const p of [
    "/giu",
    "/giu/hop",
    "/api/giu/health",
    "/api/giu/payments/vnpay/ipn",
    "/api/giu/auth/login",
  ]) {
    assert.equal(isPublicJarvisPath(p), false, `${p}가 열리면 옛 구쿠 사용자가 들어온다`);
  }
});

test("★ 새로 만든 반품 화면·API도 자동으로 잠긴다 — 기본값이 잠김이어야 한다", () => {
  assert.equal(isPublicJarvisPath("/returns"), false);
  assert.equal(isPublicJarvisPath("/api/jarvis/returns"), false);
});
