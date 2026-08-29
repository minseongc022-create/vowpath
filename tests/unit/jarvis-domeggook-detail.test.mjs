import test from "node:test";
import assert from "node:assert/strict";

import { readItemDetailExtras } from "../../jarvis/wholesale/domeggook-detail.ts";

// ─────────────────────────────────────────────────────────────
// ★ 상세페이지가 사진 한 장뿐이었던 진짜 원인
//
// confirmSingleUnitSourcing이 getItemView를 이미 부르고 있었는데, 가격
// 필드만 읽고 나머지(사진·반품주소·이미지 사용 허가)는 전부 버리고
// 있었다. WholesaleListing.detailImageUrls·supplierReturnAddress는
// 타입에 처음부터 있었지만 채우는 코드가 없었다.
//
// 아래는 실제 상품(모디스 보조배터리, no=9502515)의 getItemView 응답을
// 그대로 옮긴 것이다 — 추측한 모양이 아니라 진짜 응답으로 묶어야 같은
// 고장을 다시 안 겪는다.
// ─────────────────────────────────────────────────────────────

const REAL_RESPONSE = {
  domeggook: {
    basis: { no: 9502515, title: "보조배터리 모디스보조배터리 5000보조배터리" },
    price: { dome: "6900" },
    qty: { domeMoq: "1", domeUnit: 1 },
    thumb: {
      small: "https://cdn1.domeggook.com/upload/item/x_img_150?hash=bf08",
      large: "https://cdn1.domeggook.com/upload/item/x_img_330?hash=bf08",
      original: "https://cdn1.domeggook.com/upload/item/x_img_760?hash=bf08",
    },
    desc: {
      license: {
        usable: "true",
        msg: "상품설명에 사용된 이미지를 다른 곳에서 사용하는 것을 허용합니다.",
      },
      notice: "<div><img src='https://ai.esmplus.com/gentle10/code1/notice.gif' /></div>",
      contents: {
        item:
          "<p align=\"center\"><b><font size=\"5\">해당 상품은 온라인 판매가 9,400원 " +
          "상품입니다.(택배비 2,500원)</font></b><br>" +
          "<img src=\"https://gi.esmplus.com/emothis/customer/mothis_formal_g.gif\" width=\"800\">" +
          "<img src=\"https://gi.esmplus.com/emothis/2019/mothis/mothis_20w_mini_battery_1.jpg\">" +
          "<img src=\"https://gi.esmplus.com/emothis/2019/mothis/mothis_20w_mini_battery_2.jpg\">" +
          "</p>",
      },
    },
    seller: { id: "emothis", nick: "모디스" },
    detail: { country: "수입산_아시아_중국", manufacturer: "주식회사 모디스" },
    return: {
      addr: {
        no: "21406",
        zipcode: "21990",
        address1: "인천 연수구 송도미래로 30 (송도동, 송도 BRC 스마트밸리 지식산업센터)",
        address2: "B동 817호",
        phone: "032-682-2400",
        mobile: "010-2488-9781",
      },
      deliAmt: 2500,
    },
  },
};

test("★ 이미지 사용이 허가되면 상세설명 속 진짜 사진들을 가져온다", () => {
  const extras = readItemDetailExtras(REAL_RESPONSE);
  assert.equal(extras.license?.usable, true);
  assert.ok(extras.licensedImageUrls.includes(
    "https://gi.esmplus.com/emothis/2019/mothis/mothis_20w_mini_battery_1.jpg",
  ));
  assert.ok(extras.licensedImageUrls.includes(
    "https://gi.esmplus.com/emothis/2019/mothis/mothis_20w_mini_battery_2.jpg",
  ));
});

test("대표 이미지는 라이선스와 무관하게 항상 나온다", () => {
  const extras = readItemDetailExtras(REAL_RESPONSE);
  assert.equal(extras.primaryImageUrl, "https://cdn1.domeggook.com/upload/item/x_img_330?hash=bf08");
});

test("대표 이미지와 중복되는 사진은 두 번 안 들어간다", () => {
  const withDup = JSON.parse(JSON.stringify(REAL_RESPONSE));
  withDup.domeggook.desc.contents.item += `<img src="${withDup.domeggook.thumb.large}">`;
  const extras = readItemDetailExtras(withDup);
  const count = extras.licensedImageUrls.filter((u) => u === withDup.domeggook.thumb.large).length;
  assert.equal(count, 0);
});

test("★ 이미지 사용이 허가 안 됐으면 상세설명 사진을 안 가져온다 — 저작권 문제가 된다", () => {
  const notLicensed = JSON.parse(JSON.stringify(REAL_RESPONSE));
  notLicensed.domeggook.desc.license.usable = "false";
  const extras = readItemDetailExtras(notLicensed);
  assert.equal(extras.license?.usable, false);
  assert.equal(extras.licensedImageUrls.length, 0);
  // 대표 이미지 한 장은 그래도 나온다
  assert.ok(extras.primaryImageUrl);
});

test("허가 여부를 못 읽으면 허용으로 단정하지 않는다", () => {
  const unknown = JSON.parse(JSON.stringify(REAL_RESPONSE));
  delete unknown.domeggook.desc.license;
  const extras = readItemDetailExtras(unknown);
  assert.equal(extras.license, null);
  assert.equal(extras.licensedImageUrls.length, 0);
});

test("배너·안내 GIF(desc.notice)는 상품 사진으로 안 친다", () => {
  const extras = readItemDetailExtras(REAL_RESPONSE);
  assert.ok(!extras.licensedImageUrls.some((u) => u.includes("notice.gif")));
});

test("★ 반품 주소가 구조화된 필드 그대로 완성된 한 줄로 나온다", () => {
  const extras = readItemDetailExtras(REAL_RESPONSE);
  assert.match(extras.returnAddress, /21990/);
  assert.match(extras.returnAddress, /송도미래로 30/);
  assert.match(extras.returnAddress, /B동 817호/);
});

test("반품 주소가 없으면 undefined다 — 지어내지 않는다", () => {
  const noAddr = JSON.parse(JSON.stringify(REAL_RESPONSE));
  delete noAddr.domeggook.return;
  const extras = readItemDetailExtras(noAddr);
  assert.equal(extras.returnAddress, undefined);
});

test("원산지를 사람이 읽는 구분자로 바꿔서 낸다", () => {
  const extras = readItemDetailExtras(REAL_RESPONSE);
  assert.equal(extras.originCountry, "수입산 / 아시아 / 중국");
});
