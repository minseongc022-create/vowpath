import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessFlowRisk } from "@/vibesafe/lib/flows/safety";

/**
 * 연결 직후 자동으로 켜지는 범위는 이 제품에서 가장 조심해야 하는 경계다.
 * 남의 운영 중인 앱에서 사람이 확인하지 않은 채 실행되는 유일한 지점이다.
 */

const SOURCE = readFileSync("vibesafe/lib/onboarding.ts", "utf8");

test("자동으로 켜는 조건은 riskLevel === 'safe' 하나뿐이다", () => {
  // 조건을 넓히면(예: caution까지) 글을 쓰거나 데이터를 남기는 흐름이
  // 사용자 확인 없이 운영 앱에서 실행된다.
  assert.match(SOURCE, /f\.riskLevel === "safe" && f\.status === "pending"/);
  assert.ok(
    !/riskLevel !== "blocked"/.test(SOURCE.split("const autoEnable")[1]?.split("\n")[0] ?? ""),
    "blocked만 빼는 방식으로 넓히면 caution이 자동으로 켜진다",
  );
});

test("caution·blocked는 자동으로 켜지지 않고 사람에게 넘어간다", () => {
  assert.match(SOURCE, /needsReview/);
  assert.match(SOURCE, /f\.riskLevel !== "safe"/);
});

test("자동으로 켠 사실을 기록으로 남긴다", () => {
  // 사용자가 나중에 "이건 언제 켜진 거지?"라고 물을 때 답할 수 있어야 한다.
  assert.match(SOURCE, /flow_auto_enabled/);
});

test("자동 켜기 대상이 되는 흐름은 실제로 부작용이 없는 것들이다", () => {
  const click = (description) => ({ action: "click", description, selector: `text:${description}` });
  const fill = (description, value) => ({ action: "fill", description, value });

  // 읽기·로그인·검색은 눌러도 되돌릴 수 있다 → safe → 자동으로 켠다.
  const reversible = [
    {
      title: "로그인",
      description: "이메일로 로그인한다",
      category: "auth",
      steps: [fill("이메일 입력", "a@b.com"), click("로그인")],
    },
    {
      title: "매장 검색",
      description: "가게를 검색한다",
      category: "search",
      steps: [fill("검색어 입력", "카페"), click("검색")],
    },
  ];
  for (const flow of reversible) {
    assert.equal(assessFlowRisk(flow).level, "safe", `${flow.title}이(가) safe가 아니다`);
  }

  // 부작용이 있는 것들은 safe가 아니어야 한다 = 자동으로 안 켜진다.
  // ★ 여기서 중요한 건 "실제로 누르는 단계"가 있다는 점이다. 클릭이 하나도
  //   없는 흐름은 화면을 열어 글자만 확인하므로 이름이 "결제"여도 안전하다
  //   (safety.ts가 의도적으로 그렇게 판정한다 — "결제 내역 확인"을 이름
  //   때문에 막으면 정작 봐야 할 것을 못 본다).
  const sideEffects = [
    { title: "결제하기", description: "카드로 결제한다", category: "checkout", steps: [click("결제하기")] },
    { title: "회원 탈퇴", description: "계정을 삭제한다", category: "other", steps: [click("탈퇴하기")] },
    { title: "문자 발송", description: "알림톡을 보낸다", category: "other", steps: [click("문자 발송")] },
    { title: "예약 확정", description: "주문을 확정한다", category: "other", steps: [click("예약확정")] },
    { title: "글쓰기", description: "새 글을 작성한다", category: "create", steps: [click("작성하기")] },
  ];
  for (const flow of sideEffects) {
    assert.notEqual(assessFlowRisk(flow).level, "safe", `${flow.title}이(가) 자동으로 켜질 수 있다`);
  }
});

test("클릭이 없는 읽기 전용 흐름은 이름과 무관하게 safe다", () => {
  // 자동 켜기가 이 판정에 기대고 있으므로, 이 동작이 바뀌면 알아야 한다.
  const readOnly = {
    title: "결제 내역 확인",
    description: "지난 결제 내역을 본다",
    category: "browse",
    steps: [
      { action: "goto", description: "결제 내역 페이지 열기", value: "/orders" },
      { action: "expect_text", description: "결제 내역이 보이는지 확인", value: "결제 내역" },
    ],
  };
  assert.equal(assessFlowRisk(readOnly).level, "safe");
});

test("켤 흐름이 하나도 없으면 빈 검사를 걸지 않는다", () => {
  assert.match(SOURCE, /activeCount === 0/);
});

test("배포 주소 자동 감지도 SSRF 검사를 통과한 것만 돌려준다", () => {
  const detect = readFileSync("vibesafe/lib/github/detect-url.ts", "utf8");
  assert.match(detect, /validateServiceUrl/);
  // 검사를 통과 못 한 후보는 버린다
  assert.match(detect, /if \(!check\.ok\) continue;/);
});
