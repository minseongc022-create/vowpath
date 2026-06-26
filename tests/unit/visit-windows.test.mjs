import test from "node:test";
import assert from "node:assert/strict";
import {
  getVisitWindowsForSlots,
  isContinuousVisitWindows,
  patchContinuousVisitWindow,
} from "../../lib/visit-windows.ts";

test("split windows use morning and afternoon blocks", () => {
  const settings = {
    amWindowStart: 8,
    amWindowEnd: 12,
    pmWindowStart: 12,
    pmWindowEnd: 17,
  };
  assert.equal(isContinuousVisitWindows(settings), false);
  assert.deepEqual(getVisitWindowsForSlots(settings), [
    { startH: 8, endH: 12 },
    { startH: 12, endH: 17 },
  ]);
});

test("continuous windows collapse to one block", () => {
  const settings = {
    amWindowStart: 8,
    amWindowEnd: 17,
    pmWindowStart: 17,
    pmWindowEnd: 17,
  };
  assert.equal(isContinuousVisitWindows(settings), true);
  assert.deepEqual(getVisitWindowsForSlots(settings), [{ startH: 8, endH: 17 }]);
});

test("patchContinuousVisitWindow stores collapsed PM window", () => {
  const patch = patchContinuousVisitWindow(7, 19);
  assert.deepEqual(patch, {
    amWindowStart: 7,
    amWindowEnd: 19,
    pmWindowStart: 19,
    pmWindowEnd: 19,
    businessDayStartHour: 7,
    businessDayEndHour: 19,
  });
});
