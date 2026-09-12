import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REPAIR_STATUSES,
  canApply,
  canTransition,
  isTerminal,
  stageLabel,
  stepIndex,
} from "@/vibesafe/lib/repair/pipeline";
import { repairHeadline, verifySentences } from "@/vibesafe/lib/repair/present";

/**
 * 상태 기계가 헐거우면 "검증도 안 끝났는데 적용 버튼이 살아 있는" 화면이
 * 반드시 하나 생긴다. 그걸 데이터가 아니라 구조로 막는다.
 */

test("검증을 통과하지 않은 상태에서는 적용할 수 없다", () => {
  const notReady = REPAIR_STATUSES.filter((s) => s !== "ready_to_apply");
  for (const status of notReady) {
    const gate = canApply({ status, hasPermission: true, prNumber: 12 });
    assert.equal(gate.allowed, false, `${status}에서 적용이 허용됐다`);
    assert.ok(gate.reason.length > 0, `${status}에 거절 이유가 없다`);
  }
  assert.equal(
    canApply({ status: "ready_to_apply", hasPermission: true, prNumber: 12 }).allowed,
    true,
  );
});

test("권한이 없으면 검증을 통과해도 적용할 수 없다", () => {
  const gate = canApply({ status: "ready_to_apply", hasPermission: false, prNumber: 12 });
  assert.equal(gate.allowed, false);
  assert.match(gate.reason, /권한/);
});

test("올릴 PR이 없으면 적용할 수 없다", () => {
  assert.equal(
    canApply({ status: "ready_to_apply", hasPermission: true, prNumber: null }).allowed,
    false,
  );
});

test("verifying에서 곧바로 applied로 건너뛸 수 없다", () => {
  assert.equal(canTransition("verifying", "applied"), false);
  assert.equal(canTransition("verifying", "ready_to_apply"), true);
  assert.equal(canTransition("needs_human", "applying"), false);
  assert.equal(canTransition("ready_to_apply", "applying"), true);
  assert.equal(canTransition("applying", "applied"), true);
  assert.equal(canTransition("applied", "verified"), true);
});

test("끝난 상태에서는 더 움직이지 않는다", () => {
  assert.equal(isTerminal("verified"), true);
  assert.equal(isTerminal("rejected"), true);
  assert.equal(isTerminal("superseded"), true);
  assert.equal(isTerminal("needs_human"), false);
  for (const to of REPAIR_STATUSES) {
    assert.equal(canTransition("verified", to), false, `verified에서 ${to}로 갔다`);
  }
});

test("★ applied는 '고쳤습니다'가 아니다 — verified만 그렇게 말한다", () => {
  // 이 제품에서 가장 중요한 구분이다. 머지했다고 고쳐진 게 아니다.
  const args = { flowTitle: "결제하기", roleTitle: "손님", mode: "simple" };

  const applied = repairHeadline({ ...args, status: "applied" });
  assert.ok(!/고쳤습니다/.test(applied), `applied가 '고쳤습니다'라고 말한다: ${applied}`);
  assert.match(applied, /확인/);

  const verified = repairHeadline({ ...args, status: "verified" });
  assert.match(verified, /고쳤습니다/);
  assert.match(verified, /실제 서비스/);

  // 검증 전 단계도 마찬가지다.
  for (const status of ["draft", "proposed", "opened", "verifying", "ready_to_apply", "applying"]) {
    const text = repairHeadline({ ...args, status });
    assert.ok(!/고쳤습니다/.test(text), `${status}가 '고쳤습니다'라고 말한다: ${text}`);
  }
});

test("간편 모드 문구에 PR·브랜치·커밋이 나오지 않는다", () => {
  for (const status of REPAIR_STATUSES) {
    const text = repairHeadline({
      status,
      mode: "simple",
      flowTitle: "로그인",
      roleTitle: null,
    });
    assert.ok(
      !/\bPR\b|Pull Request|브랜치|커밋|머지|sha/i.test(text),
      `간편 모드 ${status}에 기술 용어가 있다: ${text}`,
    );
  }
});

test("모르는 검증 결과를 통과로 말하지 않는다", () => {
  const lines = verifySentences({
    mode: "simple",
    flowTitle: "결제하기",
    affectedFlowPassed: null,
    regressionPassed: null,
    buildPassed: null,
    otherFlowCount: 0,
  });
  for (const line of lines) {
    assert.equal(line.ok, null);
    assert.ok(/못했습니다|없어/.test(line.text), `모르는 것을 단정한다: ${line.text}`);
  }
});

test("모든 상태에 두 모드의 문구가 있다", () => {
  for (const status of REPAIR_STATUSES) {
    assert.ok(stageLabel(status, "simple").length > 0);
    assert.ok(stageLabel(status, "expert").length > 0);
  }
});

test("진행 단계는 실패·거절에서 0이다", () => {
  assert.equal(stepIndex("failed"), 0);
  assert.equal(stepIndex("rejected"), 0);
  assert.equal(stepIndex("verified"), 5);
  assert.ok(stepIndex("verifying") < stepIndex("applied"));
});
