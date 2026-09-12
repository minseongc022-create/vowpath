/**
 * 줄 단위 diff.
 *
 * 라이브러리를 쓰지 않은 이유: 여기서 필요한 건 "바뀐 줄 앞뒤로 조금"이 전부고,
 * 입력 크기는 이미 상한(12,000자)이 걸려 있다. 이것 하나 때문에 번들에
 * 의존성을 더하고 싶지 않았다.
 *
 * ★ diff를 저장해두는 이유
 *
 * 파일 전체를 두 벌 보관하면 DB가 금방 커지고, 반대로 "무엇을 바꿨는지"
 * 한 줄 설명만 남기면 사용자가 검증할 수 없다. 사용자가 [적용하기]를 누르기
 * 전에 **무엇이 바뀌는지 직접 눈으로 보게** 하려면 diff가 있어야 한다.
 */

export type DiffLine = { kind: "context" | "add" | "remove"; text: string; before: number | null; after: number | null };
export type DiffHunk = { header: string; lines: DiffLine[] };
export type FileDiff = { path: string; hunks: DiffHunk[]; added: number; removed: number; truncated: boolean };

const CONTEXT = 3;
const MAX_LINES_PER_FILE = 400;

/** 공통 부분 수열 — 작은 파일에서만 쓰므로 단순한 DP로 충분하다. */
function lcsTable(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");

  // 아주 큰 파일에서 O(n*m)이 부담이 되면 전체를 교체로 표시한다.
  if (a.length * b.length > 4_000_000) {
    return [
      ...a.map((text, i) => ({ kind: "remove" as const, text, before: i + 1, after: null })),
      ...b.map((text, i) => ({ kind: "add" as const, text, before: null, after: i + 1 })),
    ];
  }

  const table = lcsTable(a, b);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: "context", text: a[i], before: i + 1, after: j + 1 });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ kind: "remove", text: a[i], before: i + 1, after: null });
      i++;
    } else {
      out.push({ kind: "add", text: b[j], before: null, after: j + 1 });
      j++;
    }
  }
  while (i < a.length) out.push({ kind: "remove", text: a[i], before: ++i, after: null });
  while (j < b.length) out.push({ kind: "add", text: b[j], before: null, after: ++j });
  return out;
}

/** 바뀐 줄 주변만 남긴다 — 500줄짜리 파일에서 한 줄 고친 걸 보여줄 때 필요하다. */
export function buildFileDiff(path: string, before: string, after: string): FileDiff {
  const lines = diffLines(before, after);
  const changed = lines.map((l) => l.kind !== "context");

  const keep = new Array(lines.length).fill(false);
  for (let i = 0; i < lines.length; i++) {
    if (!changed[i]) continue;
    for (let k = Math.max(0, i - CONTEXT); k <= Math.min(lines.length - 1, i + CONTEXT); k++) keep[k] = true;
  }

  const hunks: DiffHunk[] = [];
  let current: DiffLine[] = [];
  let startBefore: number | null = null;
  let startAfter: number | null = null;
  let emitted = 0;
  let truncated = false;

  const flush = () => {
    if (current.length === 0) return;
    hunks.push({
      header: `@@ -${startBefore ?? 0} +${startAfter ?? 0} @@`,
      lines: current,
    });
    current = [];
    startBefore = null;
    startAfter = null;
  };

  for (let i = 0; i < lines.length; i++) {
    if (!keep[i]) {
      flush();
      continue;
    }
    if (emitted >= MAX_LINES_PER_FILE) {
      truncated = true;
      break;
    }
    if (current.length === 0) {
      startBefore = lines[i].before;
      startAfter = lines[i].after;
    }
    current.push(lines[i]);
    emitted++;
  }
  flush();

  return {
    path,
    hunks,
    added: lines.filter((l) => l.kind === "add").length,
    removed: lines.filter((l) => l.kind === "remove").length,
    truncated,
  };
}

/** 간편 모드용 한 줄 요약 — diff를 보여주지 않을 때 쓴다. */
export function describeDiff(diffs: FileDiff[]): string {
  if (diffs.length === 0) return "바뀌는 내용이 없습니다.";
  const added = diffs.reduce((n, d) => n + d.added, 0);
  const removed = diffs.reduce((n, d) => n + d.removed, 0);
  const files = diffs.length === 1 ? `${diffs[0].path.split("/").pop()} 파일` : `파일 ${diffs.length}개`;
  return `${files}에서 ${added}줄을 더하고 ${removed}줄을 지웁니다.`;
}
