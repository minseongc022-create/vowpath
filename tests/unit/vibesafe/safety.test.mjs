import { test } from "node:test";
import assert from "node:assert/strict";
import { assessFlowRisk, canActivate, canExecute } from "@/vibesafe/lib/flows/safety";

/**
 * 이 파일이 지키는 것: "AI 판단만으로 운영 앱에서 돈이 나가지 않는다".
 * 여기 테스트가 깨지면 기능이 아니라 안전장치가 깨진 것이다.
 */

const step = (action, description, extra = {}) => ({ action, description, ...extra });

test("읽기만 하는 흐름은 안전하다", () => {
  const risk = assessFlowRisk({
    title: "예약 목록 확인",
    steps: [step("goto", "예약 목록 열기"), step("expect_text", "목록이 보이는지 확인")],
  });
  assert.equal(risk.level, "safe");
});

test("결제 버튼을 누르는 흐름은 차단된다", () => {
  const risk = assessFlowRisk({
    title: "주문 흐름",
    steps: [step("goto", "장바구니 열기"), step("click", "결제하기 버튼 누르기")],
  });
  assert.equal(risk.level, "blocked");
  assert.match(risk.reason ?? "", /결제/);
});

test("영문 checkout도 차단된다", () => {
  const risk = assessFlowRisk({
    title: "Buy flow",
    steps: [step("click", "click the checkout button")],
  });
  assert.equal(risk.level, "blocked");
});

test("삭제·탈퇴는 차단된다", () => {
  for (const label of ["계정 삭제 버튼 누르기", "회원 탈퇴하기", "click delete account"]) {
    const risk = assessFlowRisk({ title: "정리", steps: [step("click", label)] });
    assert.equal(risk.level, "blocked", `"${label}" 는 차단되어야 한다`);
  }
});

test("문자·이메일 발송은 차단된다", () => {
  const risk = assessFlowRisk({
    title: "알림 확인",
    steps: [step("click", "문자 발송하기 누르기")],
  });
  assert.equal(risk.level, "blocked");
});

test("결제 화면을 보기만 하는 흐름은 차단하지 않는다", () => {
  // "결제 내역 확인"까지 막으면 정작 확인해야 할 것을 못 본다.
  const risk = assessFlowRisk({
    title: "결제 내역 확인",
    steps: [step("goto", "결제 내역 열기"), step("expect_text", "결제 내역이 보이는지 확인")],
  });
  assert.equal(risk.level, "safe");
});

test("글 작성은 '확인 필요'다", () => {
  const risk = assessFlowRisk({
    title: "게시물 작성",
    steps: [step("fill", "제목 입력"), step("click", "등록 버튼 누르기")],
  });
  assert.equal(risk.level, "caution");
});

test("로그인은 입력·클릭이 있어도 안전하다", () => {
  const risk = assessFlowRisk({
    title: "로그인",
    steps: [step("fill", "이메일 입력"), step("click", "로그인 버튼 누르기")],
  });
  assert.equal(risk.level, "safe");
});

test("무엇을 하는지 모호한 클릭은 안전한 쪽으로 기운다", () => {
  const risk = assessFlowRisk({
    title: "무언가",
    steps: [step("click", "버튼 누르기")],
  });
  assert.equal(risk.level, "caution");
});

test("차단된 흐름은 켤 수도, 실행할 수도 없다", () => {
  assert.equal(canActivate("blocked"), false);
  assert.equal(canExecute("blocked", "active"), false, "status가 active여도 실행되면 안 된다");
  assert.equal(canExecute("safe", "pending"), false, "확인 전에는 실행되지 않는다");
  assert.equal(canExecute("safe", "active"), true);
  assert.equal(canExecute("caution", "active"), true);
});
