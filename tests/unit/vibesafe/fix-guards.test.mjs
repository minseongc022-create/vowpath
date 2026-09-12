import { test } from "node:test";
import assert from "node:assert/strict";
import { changeIsReasonable, isEditable } from "@/vibesafe/lib/repair/propose-fix";

/**
 * 자동 수정의 안전장치.
 *
 * 이 두 함수가 뚫리면 AI가 만든 코드가 남의 저장소에 그대로 올라간다.
 * 기능 테스트가 아니라 사고 방지 테스트다.
 */

test("설정·워크플로·의존성 파일은 자동 수정 대상이 아니다", () => {
  const forbidden = [
    ".github/workflows/deploy.yml",  // CI를 고치면 검사를 우회할 수 있다
    ".env",
    ".env.production",
    "package.json",                   // 의존성 변경은 사람이
    "package-lock.json",
    "pnpm-lock.yaml",
    "prisma/migrations/001_init/migration.sql",
    "next.config.ts",
    "vercel.json",
  ];
  for (const path of forbidden) {
    assert.equal(isEditable(path), false, `${path} 는 수정 금지여야 한다`);
  }
});

test("평범한 소스 파일은 수정할 수 있다", () => {
  for (const path of ["app/login/page.tsx", "lib/auth.ts", "components/Button.tsx", "styles/main.css"]) {
    assert.equal(isEditable(path), true, `${path} 는 수정 가능해야 한다`);
  }
});

test("이미지·바이너리는 수정하지 않는다", () => {
  for (const path of ["public/logo.png", "assets/font.woff2", "data.csv"]) {
    assert.equal(isEditable(path), false, path);
  }
});

test("한 줄만 고친 변경은 통과한다", () => {
  const before = Array.from({ length: 40 }, (_, i) => `const line${i} = ${i};`).join("\n");
  const after = before.replace("const line10 = 10;", "const line10 = 11;");
  assert.equal(changeIsReasonable(before, after), true);
});

test("파일을 통째로 새로 쓴 변경은 거절한다", () => {
  // ★ 실제로 일어나는 일이다 — "버튼 텍스트 한 줄 고쳐줘"에 파일 전체가
  //   리팩터링되어 돌아온다. 그걸 그대로 PR로 올리면 리뷰가 불가능해진다.
  const before = Array.from({ length: 40 }, (_, i) => `const line${i} = ${i};`).join("\n");
  const after = Array.from({ length: 40 }, (_, i) => `let renamed${i} = ${i * 2};`).join("\n");
  assert.equal(changeIsReasonable(before, after), false);
});

test("내용을 절반 이상 지운 변경은 거절한다", () => {
  const before = Array.from({ length: 60 }, (_, i) => `line ${i}`).join("\n");
  const after = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n");
  assert.equal(changeIsReasonable(before, after), false);
});

test("빈 내용은 거절한다", () => {
  assert.equal(changeIsReasonable("const a = 1;\nconst b = 2;", ""), false);
  assert.equal(changeIsReasonable("const a = 1;", "   \n  "), false);
});

test("파일을 두 배 이상 부풀린 변경은 거절한다", () => {
  const before = Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n");
  const after = Array.from({ length: 120 }, (_, i) => `new line ${i}`).join("\n");
  assert.equal(changeIsReasonable(before, after), false);
});

test("작은 파일에 몇 줄 추가하는 건 통과한다", () => {
  // 상한을 너무 빡빡하게 잡으면 정상적인 수정까지 막힌다.
  const before = "export function a() {\n  return 1;\n}";
  const after = "export function a() {\n  const x = 1;\n  return x;\n}";
  assert.equal(changeIsReasonable(before, after), true);
});
