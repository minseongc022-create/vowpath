import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareFlows } from "@/vibesafe/lib/analysis/prepare-flows";

const step = (action, description, extra = {}) => ({
  action, selector: null, value: null, secretRef: null, description, optional: false, ...extra,
});

const flow = (over = {}) => ({
  key: "browse", title: "둘러보기", description: "", category: "browse",
  riskLevel: "safe", requiresLogin: false,
  steps: [step("goto", "메인 열기", { value: "/" }), step("expect_text", "문구 확인", { value: "환영" })],
  ...over,
});

test("AI가 매긴 위험도를 우리 규칙이 덮어쓴다", () => {
  // ★ 이 테스트가 이 파일의 존재 이유다.
  const [result] = prepareFlows({
    appType: "쇼핑몰", summary: "", stack: {},
    flows: [flow({
      key: "pay", title: "결제하기", riskLevel: "safe",
      steps: [
        step("goto", "결제 화면 열기", { value: "/pay" }),
        step("click", "결제하기 버튼 누르기", { selector: "role:button|결제하기" }),
        step("expect_text", "완료 확인", { value: "완료" }),
      ],
    })],
  });
  assert.equal(result.riskLevel, "blocked", "AI가 safe라고 해도 결제는 차단이다");
});

test("확인 단계가 없는 흐름은 버린다", () => {
  const results = prepareFlows({
    appType: "", summary: "", stack: {},
    flows: [flow({ steps: [step("goto", "열기", { value: "/" }), step("click", "누르기", { selector: "text:x" })] })],
  });
  assert.equal(results.length, 0, "열리기만 하면 통과하는 검사는 의미가 없다");
});

test("goto에 외부 절대 URL을 넣으면 그 단계를 버린다", () => {
  const results = prepareFlows({
    appType: "", summary: "", stack: {},
    flows: [flow({
      steps: [
        step("goto", "남의 사이트 열기", { value: "https://evil.example.com" }),
        step("expect_text", "확인", { value: "x" }),
      ],
    })],
  });
  assert.equal(results.length, 0, "단계가 버려지면 흐름도 성립하지 않는다");
});

test("key를 안정적인 형태로 정리하고 중복을 없앤다", () => {
  const results = prepareFlows({
    appType: "", summary: "", stack: {},
    flows: [flow({ key: "My Flow!" }), flow({ key: "my flow" })],
  });
  assert.equal(results[0].key, "my_flow");
  assert.notEqual(results[1].key, results[0].key, "같은 key 두 개가 나오면 baseline이 섞인다");
});

test("흐름 개수에 상한을 둔다", () => {
  const results = prepareFlows({
    appType: "", summary: "", stack: {},
    flows: Array.from({ length: 20 }, (_, i) => flow({ key: `flow_${i}` })),
  });
  assert.ok(results.length <= 6, `상한을 넘었다: ${results.length}`);
});

test("flows가 비어 있어도 죽지 않는다", () => {
  assert.deepEqual(prepareFlows({ appType: "", summary: "", stack: {}, flows: [] }), []);
  assert.deepEqual(prepareFlows({ appType: "", summary: "", stack: {} }), []);
});
