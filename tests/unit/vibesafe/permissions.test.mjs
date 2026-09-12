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

test("코드를 main에 직접 push하는 권한은 존재하지 않는다", () => {
  // ★ 이 테스트가 지키는 것: 되돌릴 수 없는 행동을 자동화하지 않는다는 원칙.
  const keys = Object.keys(PERMISSION_LABELS);
  assert.deepEqual(keys.sort(), ["diagnose", "proposePr", "rollback"]);
  assert.ok(!keys.some((k) => /push|commit|deploy|merge/i.test(k)));
});
