import test from "node:test";
import assert from "node:assert/strict";

import {
  byteLength,
  explainSolapiError,
  isSolapiConfigured,
  LMS_KR_LIMIT,
  pickMessageType,
  sendSolapiSms,
  solapiConfigFromEnv,
  toKrLocalNumber,
} from "../../jarvis/notify/solapi.ts";
import { buildLongReport } from "../../jarvis/engine/notify.ts";

// ─────────────────────────────────────────────────────────────
// ★ 트윌리오(국제발신)에서 국내 발송으로
//
// 국제발신이 걸리던 세 가지: 한국이 Geo permissions에 없으면 아예 안
// 나가고, UCS-2라 67자를 넘으면 쪼개져 뜻이 뒤집히고, 단가가 다섯 배다.
// 국내 발송은 셋이 다 없어진다 — 특히 LMS는 한글 1,000자가 한 통이라
// "잘릴까 봐 안 보낸다"는 규칙 자체가 필요 없어진다.
// ─────────────────────────────────────────────────────────────

test("설정이 하나라도 빠지면 안 켜진다 — 발신번호 없이 키만 있어도 못 보낸다", () => {
  const saved = { ...process.env };
  try {
    delete process.env.SOLAPI_API_KEY;
    delete process.env.SOLAPI_API_SECRET;
    delete process.env.SOLAPI_SENDER_PHONE;
    assert.equal(isSolapiConfigured(), false);

    process.env.SOLAPI_API_KEY = "k";
    process.env.SOLAPI_API_SECRET = "s";
    assert.equal(isSolapiConfigured(), false, "발신번호가 없으면 켜지면 안 된다");

    process.env.SOLAPI_SENDER_PHONE = "01012345678";
    assert.equal(isSolapiConfigured(), true);
    assert.equal(solapiConfigFromEnv().from, "01012345678");
  } finally {
    process.env = saved;
  }
});

test("번호를 국내 형식으로 바꾼다", () => {
  assert.equal(toKrLocalNumber("010-1234-5678"), "01012345678");
  assert.equal(toKrLocalNumber("+821012345678"), "01012345678");
  assert.equal(toKrLocalNumber("01012345678"), "01012345678");
});

test("국내 휴대폰이 아니면 거절한다", () => {
  assert.equal(toKrLocalNumber("+15125550100"), null);
  assert.equal(toKrLocalNumber("021234567"), null);
  assert.equal(toKrLocalNumber("아무말"), null);
});

test("한글은 2바이트로 센다 — 국내 문자는 글자가 아니라 바이트로 잰다", () => {
  assert.equal(byteLength("abc"), 3);
  assert.equal(byteLength("가나다"), 6);
});

test("짧으면 SMS(싸다), 길면 자르지 않고 LMS로 올린다", () => {
  assert.equal(pickMessageType("짧은 문자"), "SMS");
  assert.equal(pickMessageType("가".repeat(60)), "LMS");
});

test("★ 67자를 넘어도 보내진다 — 이게 국내로 옮긴 가장 큰 이유다", () => {
  const long = "가".repeat(300);
  assert.equal(pickMessageType(long), "LMS", "잘리거나 거부되면 안 된다");
});

test("설정이 없으면 보내는 척하지 않는다", async () => {
  const r = await sendSolapiSms({ to: "01012345678", text: "테스트", config: null });
  assert.equal(r.ok, false);
});

test("★ 발신번호 미등록은 사장님이 뭘 해야 하는지 알려준다", () => {
  const msg = explainSolapiError("UnregisteredSenderId", "{}");
  assert.match(msg, /발신번호/);
  assert.match(msg, /이용증명원/, "무엇을 올려야 하는지가 있어야 한다");
});

test("잔액 부족과 키 오류를 구분해 말한다 — 해야 할 일이 전혀 다르다", () => {
  assert.match(explainSolapiError("NotEnoughBalance", "{}"), /잔액/);
  assert.match(explainSolapiError("InvalidApiKey", "{}"), /API 키/);
});

// ── 긴 보고 ──────────────────────────────────────────────────

test("★ 긴 보고에는 0건일 때 왜 0인지가 들어간다 — 숫자만 오면 화면을 열어봐야 한다", () => {
  const r = buildLongReport(
    { cyclesRun: 3, productsSeen: 15, candidatesFound: 0, draftsCreated: 0 },
    { skusNow: 0, skusNeeded: 303, dailyTarget: 12 },
    { lastSummary: "검수 대기가 12건 쌓여 있어 새로 만들지 않았습니다." },
  );
  assert.match(r.message, /왜 0건인가/);
  assert.match(r.message, /검수 대기가 12건/);
});

test("긴 보고에 검수·반품 링크가 붙는다 — 눌러서 바로 들어올 수 있어야 한다", () => {
  const r = buildLongReport(
    { cyclesRun: 3, productsSeen: 15, candidatesFound: 4, draftsCreated: 4 },
    { skusNow: 4, skusNeeded: 303 },
    { pendingReview: 4, openReturns: 2 },
  );
  assert.match(r.message, /검수 대기 4건/);
  assert.match(r.message, /반품 2건/);
  assert.equal((r.message.match(/https:\/\//g) ?? []).length, 2);
});

test("대기가 0이면 그 줄을 안 넣는다 — 없는 일로 문자를 채우지 않는다", () => {
  const r = buildLongReport(
    { cyclesRun: 1, productsSeen: 5, candidatesFound: 4, draftsCreated: 4 },
    { skusNow: 4, skusNeeded: 303 },
    { pendingReview: 0, openReturns: 0 },
  );
  assert.ok(!r.message.includes("검수 대기"));
  assert.ok(!r.message.includes("반품"));
});

test("긴 보고도 LMS 한 통 안에 들어간다", () => {
  const r = buildLongReport(
    { cyclesRun: 999, productsSeen: 9999, candidatesFound: 999, draftsCreated: 999 },
    { skusNow: 999, skusNeeded: 9999, dailyTarget: 999 },
    {
      lastSummary: "가".repeat(200),
      pendingReview: 999,
      openReturns: 999,
    },
  );
  assert.equal(r.withinLimit, true, `${byteLength(r.message)}바이트로 ${LMS_KR_LIMIT * 2}를 넘는다`);
});

// ── 화면에서 넣은 키 ─────────────────────────────────────────
//
// 토스·도매꾹과 같은 방식이다. Vercel 환경변수를 건드리지 않고 설정
// 화면에서 넣어도 되어야 한다 — 배포를 다시 하지 않고 바꿀 수 있어야
// 사장님이 직접 붙일 수 있다.

import { resolveSolapiConfig } from "../../jarvis/notify/solapi.ts";

test("★ 화면에서 넣은 키로도 연결된다 — Vercel을 안 건드려도 된다", () => {
  const cfg = resolveSolapiConfig({
    solapiApiKey: "k",
    solapiApiSecret: "s",
    solapiSenderPhone: "01012345678",
  });
  assert.ok(cfg);
  assert.equal(cfg.from, "01012345678");
});

test("화면 값이 환경변수보다 우선한다 — 방금 넣은 값이 더 최신이다", () => {
  const saved = { ...process.env };
  try {
    process.env.SOLAPI_API_KEY = "env-k";
    process.env.SOLAPI_API_SECRET = "env-s";
    process.env.SOLAPI_SENDER_PHONE = "01000000000";
    const cfg = resolveSolapiConfig({
      solapiApiKey: "screen-k",
      solapiApiSecret: "screen-s",
      solapiSenderPhone: "01012345678",
    });
    assert.equal(cfg.apiKey, "screen-k");
    assert.equal(cfg.from, "01012345678");
  } finally {
    process.env = saved;
  }
});

test("화면에 반쯤만 넣으면 환경변수로 떨어진다 — 반쯤 설정된 상태를 만들지 않는다", () => {
  const saved = { ...process.env };
  try {
    process.env.SOLAPI_API_KEY = "env-k";
    process.env.SOLAPI_API_SECRET = "env-s";
    process.env.SOLAPI_SENDER_PHONE = "01000000000";
    // 발신번호를 안 넣었다 — 이 상태로 "연결됨"이 뜨면 문자가 안 나가는데
    // 화면만 초록불이 된다
    const cfg = resolveSolapiConfig({ solapiApiKey: "screen-k", solapiApiSecret: "screen-s" });
    assert.equal(cfg.apiKey, "env-k");
  } finally {
    process.env = saved;
  }
});

test("아무 데도 없으면 연결 안 된 것이다", () => {
  const saved = { ...process.env };
  try {
    delete process.env.SOLAPI_API_KEY;
    delete process.env.SOLAPI_API_SECRET;
    delete process.env.SOLAPI_SENDER_PHONE;
    assert.equal(resolveSolapiConfig({}), null);
    assert.equal(resolveSolapiConfig(undefined), null);
  } finally {
    process.env = saved;
  }
});
