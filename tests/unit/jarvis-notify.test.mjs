import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReviewAlert,
  buildPeriodicReport,
  SMS_SINGLE_SEGMENT_LIMIT,
  REPORT_INTERVAL_MS,
} from "../../jarvis/engine/notify.ts";

// ─────────────────────────────────────────────────────────────
// 이번 세션에 실제로 터진 사고 재현: 문구+URL 전체 길이가 SMS 1건
// 한도(67자)를 넘으면 해외발신 문자가 URL 한가운데서 쪼개져 뜻이 뒤집혔다.
// 새 자비스 알림도 같은 함정을 피해야 한다.
// ─────────────────────────────────────────────────────────────

test("문구+URL 전체가 SMS 1건 한도 안에 들어간다 — 자릿수가 늘어도", () => {
  for (const count of [0, 1, 2, 9, 15, 99, 999]) {
    const alert = buildReviewAlert(count);
    assert.ok(
      alert.message.length <= SMS_SINGLE_SEGMENT_LIMIT,
      `count=${count}: ${alert.message.length}자 — 한도를 넘으면 URL이 잘린다`,
    );
    assert.equal(alert.withinLimit, true);
  }
});

test("첫 줄만 읽어도 뜻이 통한다 — 쪼개져도 의미가 안 뒤집힌다", () => {
  const alert = buildReviewAlert(15);
  const [firstLine] = alert.message.split("\n");
  assert.ok(firstLine.includes("승인 대기"));
  assert.ok(firstLine.includes("15건"));
  assert.ok(firstLine.length <= 45);
});

test("링크는 effiroad.com의 실제 검수 화면을 가리킨다", () => {
  // NEXT_PUBLIC_SELLER_PULSE_AT_ROOT는 Vercel 빌드에서만 "1"로 박힌다
  // (vercel.json build.env). 로컬 tsx 실행에선 /sellerpulse가 붙으므로
  // 정확한 접두어가 아니라 "effiroad.com 도메인의 review 화면"인지만 본다.
  const alert = buildReviewAlert(3);
  assert.match(alert.message, /https:\/\/effiroad\.com\/(sellerpulse\/)?review$/m);
});

test("건수가 정확히 그 숫자로 들어간다 — 옛 파이프라인처럼 앞뒤가 안 맞으면 안 된다", () => {
  assert.match(buildReviewAlert(2).message, /2건/);
  assert.match(buildReviewAlert(15).message, /15건/);
});

// ─────────────────────────────────────────────────────────────
// 30분 보고 — 검수 알림과 같은 함정(SMS 1건 한도)을 똑같이 피해야 한다.
// 자릿수가 세 자리까지 늘어나는 현실성 없는 최악의 경우까지 재본다.
// ─────────────────────────────────────────────────────────────

test("30분 보고 문구가 최악의 경우(세 자리 숫자 전부)에도 SMS 1건 한도 안에 들어간다", () => {
  const worst = { cyclesRun: 999, productsSeen: 999, candidatesFound: 999, draftsCreated: 999 };
  const report = buildPeriodicReport(worst, { skusNow: 999, skusNeeded: 999 });
  assert.ok(
    report.message.length <= SMS_SINGLE_SEGMENT_LIMIT,
    `${report.message.length}자 — 한도를 넘으면 쪼개져서 뒤집힌다`,
  );
  assert.equal(report.withinLimit, true);
});

test("30분 보고에 소싱 횟수·확인·후보·신규·목표 진행이 정확한 숫자로 들어간다", () => {
  const window = { cyclesRun: 3, productsSeen: 87, candidatesFound: 2, draftsCreated: 1 };
  const report = buildPeriodicReport(window, { skusNow: 5, skusNeeded: 303 });
  assert.match(report.message, /3회/);
  assert.match(report.message, /87개/);
  assert.match(report.message, /후보 2개/);
  assert.match(report.message, /신규 1건/);
  assert.match(report.message, /5\/303/);
});

test("REPORT_INTERVAL_MS는 정확히 30분이다", () => {
  assert.equal(REPORT_INTERVAL_MS, 30 * 60 * 1000);
});
