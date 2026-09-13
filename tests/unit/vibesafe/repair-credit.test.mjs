import { test } from "node:test";
import assert from "node:assert/strict";
import { canStartFreeRepair } from "@/vibesafe/lib/billing/repair-credit";

/**
 * 무료 베타의 평생 1회 자동 수정 크레딧 판단.
 *
 * 이 판단은 repair/view.ts(화면)와 repair/propose-fix.ts(서버 게이트) 둘 다
 * 이 함수 하나를 그대로 쓴다 — 여기서 맞으면 두 곳 다 맞다.
 */

test("아직 한 번도 안 쓴 무료 베타는 막지 않는다", () => {
  const result = canStartFreeRepair(
    { planKey: "beta", freeRepairUsedAt: null, freeRepairIncidentId: null },
    "incident-1",
  );
  assert.equal(result.blocked, false);
});

test("이미 다른 사고에서 썼으면 새 사고는 막는다", () => {
  const result = canStartFreeRepair(
    {
      planKey: "beta",
      freeRepairUsedAt: new Date("2026-01-01"),
      freeRepairIncidentId: "incident-1",
    },
    "incident-2",
  );
  assert.equal(result.blocked, true);
});

test("크레딧을 쓴 바로 그 사고를 다시 시도하는 것은 막지 않는다", () => {
  // 첫 PR이 needs_human으로 막혀 "다른 방법으로 다시 시도"를 누른 경우.
  // 첫 시도가 틀렸다고 유일한 무료 체험이 통째로 날아가면 안 된다.
  const result = canStartFreeRepair(
    {
      planKey: "beta",
      freeRepairUsedAt: new Date("2026-01-01"),
      freeRepairIncidentId: "incident-1",
    },
    "incident-1",
  );
  assert.equal(result.blocked, false);
});

test("Pro 플랜은 크레딧을 이미 썼어도 절대 막지 않는다", () => {
  const result = canStartFreeRepair(
    {
      planKey: "pro",
      freeRepairUsedAt: new Date("2026-01-01"),
      freeRepairIncidentId: "incident-1",
    },
    "incident-2",
  );
  assert.equal(result.blocked, false);
});

test("사용자 정보가 없으면(비정상 상태) 막지 않는다 — 원인 분석 흐름을 깨지 않는다", () => {
  const result = canStartFreeRepair(null, "incident-1");
  assert.equal(result.blocked, false);
});
