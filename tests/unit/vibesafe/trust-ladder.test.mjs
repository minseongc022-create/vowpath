import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateTrustLadder, MIN_SAMPLES_FOR_RATE } from "@/vibesafe/lib/trust-ladder";

/**
 * 신뢰도 사다리 — 근거 없이 다음 권한을 권하면 안 되고, 권했다고 해서
 * 권한이 저절로 바뀌면 더더욱 안 된다. 이 두 가지를 여기서 고정한다.
 */

const BASE = {
  permissions: { diagnose: true, proposePr: false, applyFix: false, autoApplyLowRisk: false },
  incidentAccuracy: null,
  incidentSamples: 0,
  incidentConfirmedReal: 0,
  repairSuccessRate: null,
  repairSamples: 0,
  repairVerified: 0,
  repairNote: "",
  lowRiskRate: null,
  lowRiskSamples: 0,
  lowRiskVerified: 0,
};

test("표본이 부족하면 신호가 ready:false이고 제안이 없다", () => {
  const result = evaluateTrustLadder(BASE);
  assert.equal(result.suggestion, null);
  for (const signal of result.signals) {
    assert.equal(signal.ready, false);
    assert.equal(signal.value, null);
  }
});

test("감시(diagnose)조차 꺼져 있으면 아무것도 권하지 않는다", () => {
  const result = evaluateTrustLadder({
    ...BASE,
    permissions: { diagnose: false, proposePr: false, applyFix: false, autoApplyLowRisk: false },
    incidentAccuracy: 1,
    incidentSamples: 10,
    incidentConfirmedReal: 10,
  });
  assert.equal(result.suggestion, null);
});

test("정확도가 표본 문턱을 채우고 75% 이상이면 proposePr을 권한다", () => {
  const result = evaluateTrustLadder({
    ...BASE,
    incidentAccuracy: 0.8,
    incidentSamples: MIN_SAMPLES_FOR_RATE,
    incidentConfirmedReal: 4,
  });
  assert.equal(result.suggestion?.key, "proposePr");
});

test("표본이 문턱보다 하나라도 적으면 정확도가 100%여도 권하지 않는다", () => {
  const result = evaluateTrustLadder({
    ...BASE,
    incidentAccuracy: 1,
    incidentSamples: MIN_SAMPLES_FOR_RATE - 1,
    incidentConfirmedReal: MIN_SAMPLES_FOR_RATE - 1,
  });
  assert.equal(result.suggestion, null);
});

test("정확도가 75% 미만이면 표본이 충분해도 권하지 않는다", () => {
  const result = evaluateTrustLadder({
    ...BASE,
    incidentAccuracy: 0.6,
    incidentSamples: 20,
    incidentConfirmedReal: 12,
  });
  assert.equal(result.suggestion, null);
});

test("사다리는 한 칸씩만 오른다 — proposePr이 이미 켜져 있으면 그걸 다시 권하지 않는다", () => {
  const result = evaluateTrustLadder({
    ...BASE,
    permissions: { diagnose: true, proposePr: true, applyFix: false, autoApplyLowRisk: false },
    incidentAccuracy: 1,
    incidentSamples: 20,
    incidentConfirmedReal: 20,
    repairSuccessRate: null,
    repairSamples: 0,
  });
  // proposePr은 이미 켜져 있으니 그 다음(applyFix) 기준으로만 판단해야 한다.
  assert.notEqual(result.suggestion?.key, "proposePr");
  assert.equal(result.suggestion, null); // repair 표본이 없으니 applyFix도 아직 아니다.
});

test("proposePr이 켜져 있고 수정 성공률이 60% 이상이면 applyFix를 권한다", () => {
  const result = evaluateTrustLadder({
    ...BASE,
    permissions: { diagnose: true, proposePr: true, applyFix: false, autoApplyLowRisk: false },
    repairSuccessRate: 0.6,
    repairSamples: MIN_SAMPLES_FOR_RATE,
    repairVerified: 3,
  });
  assert.equal(result.suggestion?.key, "applyFix");
});

test("applyFix가 켜져 있으면 LOW 위험 표본을 따로 요구한다 — 전체 성공률로는 부족하다", () => {
  const result = evaluateTrustLadder({
    ...BASE,
    permissions: { diagnose: true, proposePr: true, applyFix: true, autoApplyLowRisk: false },
    repairSuccessRate: 1, // 전체는 완벽해 보여도
    repairSamples: 20,
    lowRiskRate: null, // LOW 표본이 없으면
    lowRiskSamples: 0,
  });
  assert.equal(result.suggestion, null); // 자동 적용은 권하지 않는다.
});

test("LOW 위험 표본이 충분하고 80% 이상이면 자동 적용을 권한다", () => {
  const result = evaluateTrustLadder({
    ...BASE,
    permissions: { diagnose: true, proposePr: true, applyFix: true, autoApplyLowRisk: false },
    lowRiskRate: 0.8,
    lowRiskSamples: MIN_SAMPLES_FOR_RATE,
    lowRiskVerified: 4,
  });
  assert.equal(result.suggestion?.key, "autoApplyLowRisk");
});

test("모든 단계가 이미 켜져 있으면 더 이상 권할 게 없다", () => {
  const result = evaluateTrustLadder({
    ...BASE,
    permissions: { diagnose: true, proposePr: true, applyFix: true, autoApplyLowRisk: true },
    incidentAccuracy: 1,
    incidentSamples: 20,
    incidentConfirmedReal: 20,
    repairSuccessRate: 1,
    repairSamples: 20,
    lowRiskRate: 1,
    lowRiskSamples: 20,
  });
  assert.equal(result.suggestion, null);
});

test("이 함수는 순수하다 — 같은 입력에 같은 출력, 부수효과 없음", () => {
  const input = { ...BASE, incidentAccuracy: 0.9, incidentSamples: 10, incidentConfirmedReal: 9 };
  const a = evaluateTrustLadder(input);
  const b = evaluateTrustLadder(input);
  assert.deepEqual(a, b);
});
