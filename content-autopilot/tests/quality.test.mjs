import assert from "node:assert/strict";
import test from "node:test";
import { evaluateQuality } from "../src/quality/gate.ts";
import { scoreTopic } from "../src/topics/selector.ts";
import { markdownToHtml, slugify } from "../src/lib/utils.ts";

const brand = {
  id: "finance-salary",
  name: "t",
  concept: "직장인 월급 현금흐름과 자산 구조를 실전으로 정리하는 미디어",
  audience: "직장인",
  voice: {
    tone: "직설",
    perspective: "실무",
    bannedPhrases: ["꿀팁 대방출"],
    mustSoundLike: "선임",
  },
  topics: {
    pillars: ["월급 관리", "현금흐름"],
    seedQueries: ["통장"],
    avoid: ["연예"],
  },
  quality: {
    minChars: 200,
    minSections: 2,
    minConcreteExamples: 1,
    minActionSteps: 2,
    maxSlopScore: 0.5,
    requireOriginalTake: true,
  },
  publishing: {
    platform: "filesystem",
    tags: [],
    locale: "ko-KR",
  },
};

test("scoreTopic penalizes gossip and rewards practical angles", () => {
  const good = scoreTopic(brand, {
    titleAngle: "월급 관리 체크리스트로 현금흐름 만들기",
    searchIntent: "월급 관리 방법",
    pillar: "월급 관리",
    hook: "구조가 먼저다",
    whyNow: "now",
    outlinePromise: ["a", "b"],
    score: 0.7,
  });
  const bad = scoreTopic(brand, {
    titleAngle: "속보 충격 연예인 신상",
    searchIntent: "가십",
    pillar: "연예",
    hook: "클릭",
    whyNow: "now",
    outlinePromise: [],
    score: 0.9,
  });
  assert.ok(good > bad);
});

test("quality gate rejects slop and deceptive bait", () => {
  const bad = evaluateQuality(brand, {
    brandId: "finance-salary",
    title: "99%가 모르는 충격 반전",
    slug: "x",
    excerpt: "x",
    markdown: `# t\n\n이번 포스팅에서는 많은 사람들이 모르는 꿀팁 대방출\n`,
    html: "<p>x</p>",
    tags: [],
    metaDescription: "x",
    wordCount: 10,
    charCount: 40,
  });
  assert.equal(bad.passed, false);
});

test("quality gate accepts solid practical article", () => {
  const md = `# 월급 현금흐름 구조

의지로 아끼는 방식은 실패한다. 핵심은 통장 구조다.

## 문제

예를 들어 급여가 한 통장에 모이면 경계가 사라진다.

## 착각

많이 벌면 해결된다는 착각이 먼저다.

## 실행

1. 통장 분리
2. 자동이체
3. 주간 점검
4. 구독 정리

## 다음

현금흐름 프레임으로 다시 설계하라.
`;
  const ok = evaluateQuality(brand, {
    brandId: "finance-salary",
    title: "월급 현금흐름 구조",
    slug: "x",
    excerpt: "x",
    markdown: md,
    html: markdownToHtml(md),
    tags: [],
    metaDescription: "x",
    wordCount: 80,
    charCount: 300,
  });
  assert.equal(ok.passed, true, JSON.stringify(ok.checks, null, 2));
});

test("slugify works for korean titles", () => {
  assert.ok(slugify("월급 관리 가이드 2026").length > 0);
});

test("factual gate blocks fabricated news patterns", async () => {
  const { passesFactualGate } = await import("../src/quality/factual.ts");
  const bad = passesFactualGate("속보: 정부 발표에 따르면", "단독: 확인됐습니다", true);
  assert.equal(bad.ok, false);
  const ok = passesFactualGate("월급 통장 구조", "예를 들어 통장을 나누면 경계가 생긴다", true);
  assert.equal(ok.ok, true);
});

test("platform safety catches duplicate paragraphs", async () => {
  const { platformSafetyScore } = await import("../src/quality/safety.ts");
  const para =
    "이 문단은 중복 검사에 걸리도록 첫 팔십자를 동일하게 유지하면서 충분히 길게 작성합니다. 예를 들어 같은 내용을 두 번 반복하면 스팸 신호로 분류될 수 있습니다.";
  const dup = platformSafetyScore("제목", `${para}\n\n${para}`);
  assert.equal(dup.ok, false);
});
