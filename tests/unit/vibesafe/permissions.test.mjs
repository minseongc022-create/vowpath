import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_LABELS } from "@/vibesafe/lib/permission-labels";

/**
 * 권한 화면의 문구는 제품의 약속이다. 여기 적힌 것과 코드가 어긋나면
 * 그건 버그가 아니라 거짓말이 된다.
 */

test("모든 권한에 하는 일과 한계가 적혀 있다", () => {
  for (const [key, label] of Object.entries(PERMISSION_LABELS)) {
    assert.ok(label.title.length > 0, `${key}에 제목이 없다`);
    assert.ok(label.detail.length > 10, `${key}에 설명이 없다`);
    assert.ok(label.risk.length > 10, `${key}에 한계 설명이 없다`);
  }
});

test("PR 권한은 '직접 push하지 않는다'를 명시한다", () => {
  // 이 약속이 화면에서 빠지면 사용자가 권한의 범위를 오해한다.
  assert.match(PERMISSION_LABELS.proposePr.risk, /직접 push하지 않습니다|머지는 직접/);
});

test("진단 권한은 아무것도 바꾸지 않는다고 명시한다", () => {
  assert.match(PERMISSION_LABELS.diagnose.risk, /읽기만|바꾸지 않습니다/);
});

test("롤백 권한은 실제 서비스가 바뀐다고 경고한다", () => {
  assert.match(PERMISSION_LABELS.rollback.risk, /실제 서비스|한도/);
});

test("적용 권한은 '사람이 누른 한 건만'이라고 명시한다", () => {
  // applyFix는 사용자의 운영 서비스를 바꾸는 유일한 권한이다. 그 범위가
  // 화면 문구에서 흐려지면, 사용자는 자기가 무엇을 허락했는지 모르게 된다.
  assert.match(PERMISSION_LABELS.applyFix.risk, /회원님이 누른 그 한 건|한 건만/);
  assert.match(PERMISSION_LABELS.applyFix.risk, /스스로 골라 머지하지 않/);
});

test("코드를 main에 직접 push하는 권한은 존재하지 않는다", () => {
  // ★ 이 테스트가 지키는 것: 되돌릴 수 없는 행동을 AI 판단만으로 실행하지
  //   않는다는 원칙.
  //
  // applyFix가 생기면서 목록이 넷이 되었지만 원칙은 그대로다. applyFix는
  //   (1) 검증을 통과한 제안에 대해 (2) 사람이 그 제안을 보고 버튼을 눌렀을 때
  //   (3) 한 번에 한 건만
  // 머지한다. "코드를 main에 직접 push"는 여전히 어느 권한으로도 불가능하고,
  // 그 사실이 화면 문구에도 적혀 있어야 한다.
  const keys = Object.keys(PERMISSION_LABELS);
  assert.deepEqual(keys.sort(), ["applyFix", "diagnose", "proposePr", "rollback"]);
  assert.ok(!keys.some((k) => /push|commit|deploy/i.test(k)));

  // 어떤 권한도 "main에 직접 쓴다"고 약속하지 않는다.
  const promisesDirectPush = Object.values(PERMISSION_LABELS).some((label) =>
    /main에 직접 (push|커밋)합니다/.test(`${label.detail} ${label.risk}`),
  );
  assert.equal(promisesDirectPush, false);

  // 그리고 최소 한 곳에서는 "직접 push하지 않는다"를 분명히 말한다.
  const saysNoDirectPush = Object.values(PERMISSION_LABELS).some((label) =>
    /직접 push하(지|는) 않/.test(`${label.detail} ${label.risk}`),
  );
  assert.equal(saysNoDirectPush, true);
});
