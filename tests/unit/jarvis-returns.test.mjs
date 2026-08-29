import test from "node:test";
import assert from "node:assert/strict";

import {
  decideReturn,
  withinWithdrawalWindow,
  summarizeDecision,
} from "../../jarvis/returns/decide.ts";
import { readSupplierReturnPolicy } from "../../jarvis/returns/rules.ts";

// ─────────────────────────────────────────────────────────────
// ★ 반품 자동 처리
//
// 틀리면 두 가지로 돈이 샌다: 받아야 할 반품비를 못 받거나(마진 손실),
// 받아들여야 할 청약철회를 거절하는 것(법 위반 + 플랫폼 페널티).
//
// 그래서 이 두뇌는 **고객에게 유리한 쪽으로만 자동**이다. 거절은 절대
// 자동으로 하지 않는다 — 전자상거래법 제17조 제6항은 철회 제한 사유를
// 미리 고지하지 않았으면 주장할 수 없게 한다.
// ─────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

function req(over = {}) {
  const delivered = new Date("2026-08-01T00:00:00Z");
  return {
    id: "r1",
    reason: "change_of_mind",
    deliveredAt: delivered.toISOString(),
    requestedAt: new Date(delivered.getTime() + 3 * DAY).toISOString(),
    paidKrw: 15900,
    outboundShippingKrw: 0,
    returnShippingKrw: 3000,
    ...over,
  };
}

const SUPPLIER_OK = {
  policyText: "교환·반품 안내: 수령 후 7일 이내 반품 가능합니다. 반품 주소로 보내주세요.",
  returnAddress: "경기도 부천시 도매로 12",
};

test("★ 7일 안 단순 변심은 자동 승인 — 판단할 여지가 없고 미루면 위반이다", () => {
  const d = decideReturn({ request: req(), supplier: SUPPLIER_OK });
  assert.equal(d.action, "accept");
  assert.equal(d.shippingBearer, "customer");
});

test("★ 단순 변심 반품비는 고객이 낸다 — 환불에서 빠진다", () => {
  const d = decideReturn({ request: req(), supplier: SUPPLIER_OK });
  assert.equal(d.refundKrw, 15900 - 3000);
  assert.equal(d.deductions.length, 1);
  assert.match(d.deductions[0].label, /반품 택배비/);
});

test("★ 불량이면 왕복 배송비를 판매자가 낸다 — 환불에서 안 뺀다", () => {
  const d = decideReturn({
    request: req({ reason: "defective", outboundShippingKrw: 3000 }),
    supplier: SUPPLIER_OK,
  });
  assert.equal(d.shippingBearer, "seller");
  assert.equal(d.deductions.length, 0, "귀책이 우리인데 고객 돈에서 빼면 안 된다");
  assert.equal(d.refundKrw, 15900 + 3000, "처음 받은 배송비도 돌려줘야 한다");
});

test("★ 불량은 7일이 지나도 받아들인다 — 하자는 3개월이다", () => {
  const delivered = new Date("2026-05-01T00:00:00Z");
  const d = decideReturn({
    request: req({
      reason: "defective",
      deliveredAt: delivered.toISOString(),
      requestedAt: new Date(delivered.getTime() + 40 * DAY).toISOString(),
    }),
    supplier: SUPPLIER_OK,
  });
  assert.equal(d.action, "accept");
});

test("★ 철회 제한 사유가 있어도 자동 거절하지 않는다 — 고지 요건 때문이다", () => {
  const d = decideReturn({
    request: req({ limits: ["value_dropped_by_use"] }),
    supplier: SUPPLIER_OK,
  });
  assert.equal(d.action, "needs_owner", "자동 거절은 그 자체가 법 위반이 될 수 있다");
  assert.ok(d.reasons.some((r) => r.includes("제17조 제6항")));
});

test("기간을 넘긴 신청은 사장님 확인으로 넘긴다 — 자동으로 자르지 않는다", () => {
  const delivered = new Date("2026-08-01T00:00:00Z");
  const d = decideReturn({
    request: req({ requestedAt: new Date(delivered.getTime() + 20 * DAY).toISOString() }),
    supplier: SUPPLIER_OK,
  });
  assert.equal(d.action, "needs_owner");
});

test("배송 완료일을 못 읽으면 기간 안으로 보되 확인을 받는다 — 우리 데이터 문제로 고객 권리를 깎지 않는다", () => {
  const w = withinWithdrawalWindow(req({ deliveredAt: "알 수 없음" }));
  assert.equal(w.ok, true);
  const d = decideReturn({ request: req({ deliveredAt: "알 수 없음" }), supplier: SUPPLIER_OK });
  assert.equal(d.action, "needs_owner");
});

test("★ 공급처 규정을 못 읽으면 공급처로 안 보낸다 — 반송되면 왕복비가 또 나간다", () => {
  const d = decideReturn({ request: req(), supplier: {} });
  assert.equal(d.shipBackTo, "seller");
  assert.equal(d.action, "needs_owner");
});

test("★ 공급처가 반품 불가면 손실이라 확인을 받는다", () => {
  const d = decideReturn({
    request: req(),
    supplier: { policyText: "단순변심 반품 불가입니다." },
  });
  assert.equal(d.shipBackTo, "seller");
  assert.equal(d.action, "needs_owner");
  assert.ok(d.reasons.some((r) => r.includes("판매자 부담")));
});

test("★ 「반품 가능」과 「반품 불가」가 같이 있으면 불가로 읽는다 — 반대로 읽으면 최악이다", () => {
  const p = readSupplierReturnPolicy({
    policyText: "반품 가능 여부 안내 — 단순변심 반품 불가",
  });
  assert.equal(p.acceptsReturns, "no");
});

test("공급처 안내가 없으면 모른다고 한다 — 대부분 받아준다고 추측하지 않는다", () => {
  const p = readSupplierReturnPolicy({});
  assert.equal(p.acceptsReturns, "unknown");
});

test("공급처가 받아주고 주소도 있으면 공급처로 바로 보낸다", () => {
  const d = decideReturn({ request: req(), supplier: SUPPLIER_OK });
  assert.equal(d.shipBackTo, "supplier");
  assert.match(d.supplierAction, /부천/);
});

test("불량이면 공급처에 왕복 배송비를 청구하라고 알려준다 — 안 받으면 우리 마진이다", () => {
  const d = decideReturn({
    request: req({ reason: "wrong_item", outboundShippingKrw: 3000 }),
    supplier: SUPPLIER_OK,
  });
  assert.match(d.supplierAction, /공급처에 청구/);
});

test("★ 환불액이 마이너스로 나오지 않는다 — 고객에게 청구하는 모양이 되면 분쟁이다", () => {
  const d = decideReturn({
    request: req({ paidKrw: 5000, returnShippingKrw: 9000 }),
    supplier: SUPPLIER_OK,
  });
  assert.equal(d.refundKrw, 0);
  assert.equal(d.action, "needs_owner");
});

test("응답 기한과 환불 기한이 항상 붙는다 — 기한이 곧 페널티다", () => {
  const now = new Date("2026-08-04T00:00:00Z");
  const d = decideReturn({ request: req(), supplier: SUPPLIER_OK, now });
  assert.ok(new Date(d.respondByIso).getTime() > now.getTime());
  assert.equal(d.refundDueBusinessDays, 3);
});

test("한 줄 요약에 처리 방향이 다 담긴다", () => {
  const d = decideReturn({ request: req(), supplier: SUPPLIER_OK });
  const line = summarizeDecision(d);
  assert.match(line, /자동 승인/);
  assert.match(line, /12,900원 환불/);
  assert.match(line, /공급처 회수/);
});

// ── 문자 ─────────────────────────────────────────────────────

import { buildReturnAlert, SMS_SINGLE_SEGMENT_LIMIT } from "../../jarvis/engine/notify.ts";

test("★ 반품 문자가 한 조각 안에 들어간다 — 잘리면 링크가 날아간다", () => {
  for (const n of [1, 9, 99, 999]) {
    const a = buildReturnAlert(n);
    assert.ok(
      a.withinLimit,
      `${n}건일 때 ${a.message.length}자로 한도(${SMS_SINGLE_SEGMENT_LIMIT})를 넘는다`,
    );
  }
});

test("반품 문자에 확인할 곳 주소가 들어간다", () => {
  const a = buildReturnAlert(2);
  assert.match(a.message, /https:\/\//);
  assert.match(a.message, /반품 2건/);
});
