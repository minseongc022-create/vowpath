import test from "node:test";
import assert from "node:assert/strict";

import { parseIntent, readGoalKrw, INTENT_MENU } from "../../jarvis/chat/intents.ts";
import { think } from "../../jarvis/chat/brain.ts";

function state(over = {}) {
  return {
    version: "2.0",
    settings: { monthlyGoalKrw: 5_000_000, autopilotEnabled: true, autoPublish: false },
    candidates: [],
    drafts: [],
    chat: [],
    ...over,
  };
}

function draft(status, i = 0, title = "테스트 상품") {
  return {
    id: `d${i}`,
    status,
    candidate: {
      id: `c${i}`,
      keyword: "정리함",
      title,
      category: "living",
      supplier: { platform: "domeme", itemNo: `s${i}`, imageUrls: [] },
      priceKrw: 24_900,
      netProfitKrw: 5_200,
      marginPct: 21,
      priceFloorKrw: 22_000,
      maxBidKrw: 100,
      breakevenCpcKrw: 150,
    },
    detailHtml: "<div>x</div>",
    sellingPoints: [],
    listingPayload: { name: title, salePrice: 24900, imageUrls: [], detailHtml: "" },
    checklist: [],
    createdAt: "",
    updatedAt: "",
  };
}

// ─────────────────────────────────────────────────────────────
// 말귀 — 되돌릴 수 없는 일은 좁게, 나머지는 넓게
// ─────────────────────────────────────────────────────────────

test("소싱 지시를 여러 말투로 알아듣는다", () => {
  for (const msg of ["상품 찾아줘", "지금 돌려", "소싱해", "더 찾아봐", "한 바퀴 돌려줘", "실행해"]) {
    assert.equal(parseIntent(msg)?.name, "source_now", `못 알아들음: ${msg}`);
  }
});

test("「올려」는 문장 전체가 그 뜻일 때만 발행으로 잡는다", () => {
  // 이게 넓게 잡히면 사장님이 보지도 않은 상품이 팔린다
  assert.equal(parseIntent("올려줘")?.name, "publish");
  assert.equal(parseIntent("이제 올려")?.name, "publish");

  assert.notEqual(parseIntent("사진 좀 올려줘 상세페이지에")?.name, "publish");
  assert.notEqual(parseIntent("상품 올리지 마")?.name, "publish");
});

test("멈춤이 켜기보다 먼저 잡힌다 — 잘못 잡혀도 안전한 쪽으로", () => {
  assert.equal(parseIntent("자동 멈춰")?.name, "autopilot_off");
  assert.equal(parseIntent("자비스 잠깐 멈춰봐")?.name, "autopilot_off");
  assert.equal(parseIntent("자동으로 해줘")?.name, "autopilot_on");
  assert.equal(parseIntent("알아서 해")?.name, "autopilot_on");
});

test("초안 삭제를 알아듣되 「지금 돌려」와 헷갈리지 않는다", () => {
  assert.equal(parseIntent("초안 다 지워")?.name, "discard_drafts");
  assert.equal(parseIntent("만든 거 다 삭제해")?.name, "discard_drafts");
  assert.equal(parseIntent("지금 돌려줘")?.name, "source_now");
});

test("목표 금액을 여러 표기로 똑같이 읽는다", () => {
  assert.equal(readGoalKrw("월 500만원 벌고 싶어"), 5_000_000);
  assert.equal(readGoalKrw("월 천만원 목표"), 10_000_000);
  assert.equal(readGoalKrw("1000만원 목표"), 10_000_000);
  assert.equal(readGoalKrw("2천만 벌자"), 20_000_000);
});

test("목표는 현실 범위 밖이면 안 받는다", () => {
  assert.equal(readGoalKrw("1억 벌자"), null, "범위 밖은 계획이 아니라 희망이다");
  assert.equal(readGoalKrw("10만원 목표"), null);
});

test("목표 지시가 소싱 지시보다 먼저 잡힌다", () => {
  // "월 천만원 벌게 만들어"는 소싱처럼 보이지만 바뀌어야 하는 건 목표값이다
  const intent = parseIntent("월 천만원 벌게 만들어줘");
  assert.equal(intent?.name, "set_goal");
  assert.equal(intent?.goalKrw, 10_000_000);
});

test("모르는 말은 규칙이 억지로 잡지 않는다 — LLM에 넘긴다", () => {
  assert.equal(parseIntent("오늘 날씨 어때"), null);
  assert.equal(parseIntent("ㅋㅋㅋ"), null);
});

// ─────────────────────────────────────────────────────────────
// 실행 — 말만 하고 안 하는 걸 막는다
// ─────────────────────────────────────────────────────────────

test("자동 운전 켜기/끄기가 실제로 상태를 바꾼다", async () => {
  const s = state();
  const off = await think(s, "자동 멈춰");
  assert.equal(off.did, "autopilot_off");
  assert.equal(s.settings.autopilotEnabled, false, "말만 하고 안 바꾸면 안 된다");

  const on = await think(s, "자동으로 해줘");
  assert.equal(on.did, "autopilot_on");
  assert.equal(s.settings.autopilotEnabled, true);
});

test("목표 변경이 실제로 저장된다", async () => {
  const s = state();
  const r = await think(s, "월 천만원 목표로 해줘");
  assert.equal(r.did, "set_goal");
  assert.equal(s.settings.monthlyGoalKrw, 10_000_000);
  assert.match(r.text, /1,000만원/);
});

test("초안 비우기가 실제로 지우되 등록된 건 남긴다", async () => {
  const s = state({
    drafts: [draft("pending_review", 1), draft("published", 2), draft("pending_review", 3)],
  });
  const r = await think(s, "초안 다 지워");
  assert.equal(r.did, "discard_drafts");
  assert.equal(s.drafts.length, 1, "등록된 것만 남아야 한다");
  assert.equal(s.drafts[0].status, "published");
});

test("검수 대기를 물으면 실제 목록을 준다", async () => {
  const s = state({ drafts: [draft("pending_review", 1, "수납 정리함 3단")] });
  const r = await think(s, "만든 거 보여줘");
  assert.equal(r.did, "show_drafts");
  assert.match(r.text, /수납 정리함 3단/);
  assert.ok(r.attachments?.some((a) => a.kind === "drafts"));
});

test("검수 대기가 없으면 다음에 뭘 하면 되는지 알려준다", async () => {
  const r = await think(state(), "만든 거 보여줘");
  assert.match(r.text, /없습니다/);
  assert.match(r.text, /찾아줘/, "다음 행동을 알려줘야 사장님이 막히지 않는다");
});

test("상태를 물으면 목표 역산까지 같이 답한다", async () => {
  const s = state({ drafts: [draft("published", 1), draft("pending_review", 2)] });
  const r = await think(s, "지금 어때?");
  assert.equal(r.did, "status");
  assert.match(r.text, /검수 대기 1건/);
  assert.match(r.text, /등록 완료 1건/);
});

test("기준을 물으면 낮추지 않는 이유까지 설명한다", async () => {
  const r = await think(state(), "어떤 기준으로 골라?");
  assert.equal(r.did, "explain_rules");
  assert.match(r.text, /손익분기/);
  assert.match(r.text, /낱개/);
});

test("소싱이 0건이어도 왜인지 숫자로 답한다 — 「없습니다」로 끝내지 않는다", async () => {
  const r = await think(state(), "상품 찾아줘");
  assert.equal(r.did, "source_now");
  assert.ok(r.text.length > 20, "이유 없이 한 줄로 끝내면 원인을 영영 모른다");
});

test("모든 의도에 실행 경로가 있다 — 목록에만 있고 동작 안 하는 건 없다", async () => {
  for (const { name } of INTENT_MENU) {
    if (name === "talk") continue; // LLM 필요
    const s = state({ drafts: [draft("pending_review", 1)] });
    const r = await think(s, ({
      source_now: "상품 찾아줘",
      status: "지금 어때",
      show_drafts: "만든 거 보여줘",
      show_detail: "상세페이지 보여줘",
      discard_drafts: "초안 다 지워",
      publish: "올려줘",
      autopilot_on: "자동으로 해",
      autopilot_off: "자동 멈춰",
      set_goal: "월 500만원 목표",
      explain_rules: "어떤 기준으로 골라",
    })[name]);
    assert.ok(r.text.length > 0, `${name}이 빈 답을 냈다`);
  }
});
