import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFileDiff, describeDiff, diffLines } from "@/vibesafe/lib/repair/diff";

/**
 * diff가 없으면 [적용하기]는 신뢰가 아니라 도박이다.
 * 사용자가 무엇이 바뀌는지 볼 수 있어야 누르는 게 합리적인 선택이 된다.
 */

test("바뀐 줄만 add/remove로 표시한다", () => {
  const before = "a\nb\nc";
  const after = "a\nB\nc";
  const lines = diffLines(before, after);
  assert.equal(lines.filter((l) => l.kind === "add").length, 1);
  assert.equal(lines.filter((l) => l.kind === "remove").length, 1);
  assert.equal(lines.filter((l) => l.kind === "context").length, 2);
});

test("같은 내용이면 변경이 없다", () => {
  const lines = diffLines("a\nb", "a\nb");
  assert.equal(lines.every((l) => l.kind === "context"), true);
});

test("긴 파일에서는 바뀐 줄 주변만 남긴다", () => {
  const before = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");
  const after = before.replace("line 100", "line 100 changed");
  const diff = buildFileDiff("app/page.tsx", before, after);

  const shown = diff.hunks.reduce((sum, h) => sum + h.lines.length, 0);
  assert.ok(shown < 20, `200줄 파일에서 ${shown}줄이나 보여준다`);
  assert.equal(diff.added, 1);
  assert.equal(diff.removed, 1);
  // 바뀐 줄이 실제로 들어 있어야 한다
  const texts = diff.hunks.flatMap((h) => h.lines.map((l) => l.text));
  assert.ok(texts.includes("line 100 changed"));
});

test("변경이 아주 많으면 잘라내고 잘랐다고 알린다", () => {
  const before = Array.from({ length: 600 }, (_, i) => `line ${i}`).join("\n");
  const after = Array.from({ length: 600 }, (_, i) => `changed ${i}`).join("\n");
  const diff = buildFileDiff("app/page.tsx", before, after);
  assert.equal(diff.truncated, true);
});

test("줄 번호가 붙는다 — 없으면 PR과 대조할 수 없다", () => {
  const diff = buildFileDiff("a.ts", "a\nb\nc", "a\nB\nc");
  const withNumbers = diff.hunks
    .flatMap((h) => h.lines)
    .filter((l) => l.before != null || l.after != null);
  assert.ok(withNumbers.length > 0);
});

test("간편 모드 요약은 숫자를 그대로 말한다", () => {
  const diff = buildFileDiff("app/components/Hero.tsx", "a\nb\nc", "a\nB\nc");
  const text = describeDiff([diff]);
  assert.match(text, /Hero\.tsx/);
  assert.match(text, /1줄을 더하고/);
  assert.match(text, /1줄을 지웁니다/);
});

test("바뀌는 게 없으면 없다고 말한다", () => {
  assert.match(describeDiff([]), /없습니다/);
});
