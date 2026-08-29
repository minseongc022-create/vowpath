import test from "node:test";
import assert from "node:assert/strict";

import {
  __readItemsForTest,
  __toListingForTest,
  UNKNOWN_MOQ,
} from "../../jarvis/wholesale/domeggook-api.ts";

// ─────────────────────────────────────────────────────────────
// ★ "검색어 24개에서 상품 0개"의 진짜 원인
//
// 도매꾹 API는 멀쩡했다. 진단으로 실제 응답을 떠 보니 같은 파라미터로
// **상품 3,777개**를 주고 있었다. 문제는 우리 쪽이었다.
//
// 도매꾹은 숫자를 **문자열로** 준다:
//     {"no":"9502515","price":"6900","unitQty":"1","deli":{"fee":"5000"}}
//
// 그런데 코드는 `typeof item.unitQty === "number"`를 요구했다. 늘 false가
// 되니 **모든 상품이 MOQ 미확인**으로 읽혔고, 소싱 게이트가 전부 걸러냈다.
// 오류는 하나도 안 났다 — 화면엔 "팔 물건이 없다"로만 보였다.
//
// 아래 응답은 프로덕션에서 실제로 받은 원문 그대로다. 추측한 모양이 아니라
// 진짜 응답으로 묶어둬야 같은 고장이 다시 안 난다.
// ─────────────────────────────────────────────────────────────

/** 프로덕션 진단에서 실제로 받은 응답 (2026-08-29, kw=보조배터리) */
const REAL_RESPONSE = {
  domeggook: {
    header: {
      numberOfItems: 3777,
      firstItem: 1,
      lastItem: 20,
      currentPage: 1,
      itemsPerPage: "20",
      numberOfPages: 189,
      sort: "qa",
    },
    list: {
      item: [
        {
          no: "9502515",
          title: "보조배터리 모디스보조배터리 5000보조배터리 20W보조배터리",
          thumb: "https://cdn1.domeggook.com//upload/item/2020/01/09/x_img_330?hash=bf08",
          idxCOM: "0",
          id: "emothis",
          price: "6900",
          unitQty: "1",
          comOnly: "false",
        },
        {
          no: "49895051",
          title: "2024 신상 디즈니 충전 대용량 10000 mAh 휴대용 보조배터리",
          thumb: "https://cdn1.domeggook.com//upload/item/2024/09/13/y_stt_330.png",
          idxCOM: "3",
          id: "whwanzhen365",
          price: "9887",
          unitQty: "0",
          comOnly: "false",
          adultOnly: "false",
          lwp: "false",
          deli: { who: "P", fee: "5000", add: "true", fromOversea: "true" },
        },
        {
          no: "41432586",
          title: "보조배터리 20000 보조배터리 C타입 대용량 모즈온",
          id: "haha7025",
          price: "11500",
          unitQty: "2",
          deli: { who: "P", fee: "2500", add: "true", fromOversea: "false" },
        },
      ],
    },
  },
};

test("★ 실제 응답에서 상품이 실제로 읽힌다 — 이게 0이라 소싱이 멈춰 있었다", () => {
  const items = __readItemsForTest(REAL_RESPONSE);
  assert.equal(items.length, 3, "껍질(domeggook→list→item)을 못 벗기면 0이 된다");
});

test("★ 문자열 MOQ가 숫자로 읽힌다 — 이게 안 되면 모든 상품이 걸러진다", () => {
  const items = __readItemsForTest(REAL_RESPONSE);
  const first = __toListingForTest(items[0], "domeggook");

  assert.ok(first, "MOQ 1짜리 상품이 버려지면 안 된다");
  assert.equal(first.moq, 1, `"1"(문자열)을 숫자 1로 읽어야 한다`);
  assert.equal(first.moqVerified, true, "확인된 MOQ여야 낱개 발주로 인정된다");
});

test("★ 문자열 가격이 숫자로 읽힌다 — 문자열이 원가에 섞이면 마진이 통째로 틀어진다", () => {
  const items = __readItemsForTest(REAL_RESPONSE);
  const first = __toListingForTest(items[0], "domeggook");

  assert.equal(first.unitPriceKrw, 6900);
  assert.equal(typeof first.unitPriceKrw, "number", "문자열이면 뒤의 계산이 전부 오염된다");
});

test("MOQ를 못 읽으면 1로 얼버무리지 않는다 — 발주 못 할 상품을 팔면 안 된다", () => {
  const items = __readItemsForTest(REAL_RESPONSE);
  // unitQty "0" — 유효한 MOQ가 아니다
  const second = __toListingForTest(items[1], "domeggook");
  assert.equal(second.moq, UNKNOWN_MOQ);
  assert.equal(second.moqVerified, false);
});

test("MOQ가 2면 2로 읽는다 — 낱개가 아닌 걸 낱개로 속이지 않는다", () => {
  const items = __readItemsForTest(REAL_RESPONSE);
  const third = __toListingForTest(items[2], "domeggook");
  assert.equal(third.moq, 2);
  assert.equal(third.moqVerified, true);
});

test("배송비도 문자열에서 숫자로 읽힌다", () => {
  const items = __readItemsForTest(REAL_RESPONSE);
  const second = __toListingForTest(items[1], "domeggook");
  assert.equal(second.shippingFeeKrw, 5000);
});

test("상품번호는 문자열로 나간다 — 주소 조립에 그대로 쓰인다", () => {
  const items = __readItemsForTest(REAL_RESPONSE);
  const first = __toListingForTest(items[0], "domeggook");
  assert.equal(first.itemNo, "9502515");
  assert.ok(first.url.includes("9502515"), "상품 주소에 번호가 들어가야 한다");
});

test("도매꾹이 오류를 200으로 줄 때는 상품이 아니라 오류로 읽는다", () => {
  // 진단에서 실제로 받은 오류 응답 (파라미터가 잘못됐을 때)
  const errorResponse = {
    errors: {
      code: "10",
      message: "올바른 요청이 아닙니다",
      dcode: "PARAMETER_ERROR",
      dmessage: "파라미터가 없거나 잘못되었습니다",
      date: "2026-08-29 18:33:59",
    },
  };
  assert.equal(__readItemsForTest(errorResponse).length, 0);
});
