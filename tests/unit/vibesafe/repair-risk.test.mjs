import { test } from "node:test";
import assert from "node:assert/strict";
import { assessRepairRisk, canAutoApply } from "@/vibesafe/lib/repair/risk";

/**
 * 위험도 분류는 "무엇을 물어보지 않고 적용해도 되는가"를 정한다.
 * 여기가 느슨해지면 제품이 사용자 서비스를 조용히 망가뜨릴 수 있다.
 */

const file = (path, before, after) => ({ path, before, after });
const SMALL = ["const a = 1;", "const b = 2;", "const c = 3;"].join("\n");
const SMALL_FIXED = ["const a = 1;", "const b = 9;", "const c = 3;"].join("\n");

test("민감한 경로를 건드리면 무조건 HIGH", () => {
  const sensitive = [
    "app/api/checkout/route.ts",
    "lib/auth.ts",
    "middleware.ts",
    "components/PaymentButton.tsx",
    "lib/session.ts",
    "prisma/schema.prisma",
    "lib/crypto.ts",
  ];
  for (const path of sensitive) {
    const result = assessRepairRisk({
      files: [file(path, SMALL, SMALL_FIXED)],
      confidence: 0.99,
    });
    assert.equal(result.level, "high", `${path}가 high가 아니다`);
  }
});

test("확신도가 낮으면 HIGH — 모르면서 고치지 않는다", () => {
  const result = assessRepairRisk({
    files: [file("components/Hero.tsx", SMALL, SMALL_FIXED)],
    confidence: 0.3,
  });
  assert.equal(result.level, "high");
  assert.ok(result.signals.some((s) => /확신도/.test(s)));
});

test("확신도를 모르면 LOW로 내려가지 않는다", () => {
  const result = assessRepairRisk({
    files: [file("components/Hero.tsx", SMALL, SMALL_FIXED)],
    confidence: null,
  });
  assert.notEqual(result.level, "low");
});

test("파일이 많거나 변경이 크면 HIGH", () => {
  const many = assessRepairRisk({
    files: [
      file("components/A.tsx", SMALL, SMALL_FIXED),
      file("components/B.tsx", SMALL, SMALL_FIXED),
      file("components/C.tsx", SMALL, SMALL_FIXED),
    ],
    confidence: 0.9,
  });
  assert.equal(many.level, "high");

  const big = assessRepairRisk({
    files: [
      file(
        "components/A.tsx",
        Array.from({ length: 60 }, (_, i) => `line ${i}`).join("\n"),
        Array.from({ length: 60 }, (_, i) => `changed ${i}`).join("\n"),
      ),
    ],
    confidence: 0.9,
  });
  assert.equal(big.level, "high");
});

test("두 번째 시도부터는 HIGH — 한 번 틀린 진단을 더 믿지 않는다", () => {
  const result = assessRepairRisk({
    files: [file("components/Hero.tsx", SMALL, SMALL_FIXED)],
    confidence: 0.95,
    attempt: 2,
  });
  assert.equal(result.level, "high");
});

test("결제·발송이 걸린 흐름과 관련되면 HIGH", () => {
  const result = assessRepairRisk({
    files: [file("components/Hero.tsx", SMALL, SMALL_FIXED)],
    confidence: 0.95,
    flowRiskLevel: "blocked",
  });
  assert.equal(result.level, "high");
});

test("LOW는 한 파일 + 작은 변경 + 높은 확신일 때만", () => {
  const result = assessRepairRisk({
    files: [file("components/Hero.tsx", SMALL, SMALL_FIXED)],
    confidence: 0.9,
  });
  assert.equal(result.level, "low");
});

test("스타일·문구 파일은 확신도가 없어도 LOW가 될 수 있다", () => {
  const result = assessRepairRisk({
    files: [file("app/styles/hero.css", SMALL, SMALL_FIXED)],
    confidence: null,
  });
  assert.equal(result.level, "low");
});

test("바꿀 파일이 없으면 HIGH이고 적용 불가", () => {
  const result = assessRepairRisk({ files: [], confidence: 0.99 });
  assert.equal(result.level, "high");
});

test("자동 적용은 LOW + 검증통과 + 한도 안쪽일 때만 허용된다", () => {
  const base = { risk: "low", autoApplyLowRisk: true, verified: true, todayCount: 0, dailyLimit: 1 };
  assert.equal(canAutoApply(base).allowed, true);

  // ★ 이 네 가지 거절이 "AI가 마음대로 고친다"를 막는 전부다.
  assert.equal(canAutoApply({ ...base, autoApplyLowRisk: false }).allowed, false);
  assert.equal(canAutoApply({ ...base, risk: "medium" }).allowed, false);
  assert.equal(canAutoApply({ ...base, risk: "high" }).allowed, false);
  assert.equal(canAutoApply({ ...base, verified: false }).allowed, false);
  assert.equal(canAutoApply({ ...base, todayCount: 1 }).allowed, false);
});

test("HIGH 위험은 자동 적용 설정이 켜져 있어도 절대 자동 적용되지 않는다", () => {
  const decision = canAutoApply({
    risk: "high",
    autoApplyLowRisk: true,
    verified: true,
    todayCount: 0,
    dailyLimit: 99,
  });
  assert.equal(decision.allowed, false);
});
