import type { ArticleDraft, Brand, QualityReport } from "../config/types.ts";
import { passesFactualGate } from "./factual.ts";
import { platformSafetyScore } from "./safety.ts";

const SLOP_PHRASES = [
  "이번 포스팅에서는",
  "많은 사람들이",
  "다양한 방법",
  "알차게",
  "꿀팁 대방출",
  "절대 후회",
  "지금 당장 클릭",
  "결론적으로 말하자면",
  "오늘 소개할 내용은",
  "지금부터 하나씩",
  "굉장히 중요한",
  "놓치면 손해",
];

export function evaluateQuality(brand: Brand, article: ArticleDraft): QualityReport {
  const checks: QualityReport["checks"] = [];
  const md = article.markdown;

  const headings = (md.match(/^##\s+/gm) || []).length;
  checks.push({
    id: "min_sections",
    ok: headings >= brand.quality.minSections,
    detail: `h2=${headings}, need>=${brand.quality.minSections}`,
  });

  checks.push({
    id: "min_chars",
    ok: article.charCount >= brand.quality.minChars,
    detail: `chars=${article.charCount}, need>=${brand.quality.minChars}`,
  });

  const examples = (md.match(/예를 들어|예:\s|실제로|가령/g) || []).length;
  checks.push({
    id: "concrete_examples",
    ok: examples >= brand.quality.minConcreteExamples,
    detail: `examples≈${examples}, need>=${brand.quality.minConcreteExamples}`,
  });

  const actions = (md.match(/^\s*[-*]|\d+\.\s+/gm) || []).length;
  checks.push({
    id: "action_steps",
    ok: actions >= brand.quality.minActionSteps,
    detail: `list_items≈${actions}, need>=${brand.quality.minActionSteps}`,
  });

  const bannedHit = brand.voice.bannedPhrases.find((p) => p && md.includes(p));
  checks.push({
    id: "banned_phrases",
    ok: !bannedHit,
    detail: bannedHit ? `hit: ${bannedHit}` : "ok",
  });

  const conceptTokens = tokenize(brand.concept + " " + brand.topics.pillars.join(" "));
  const overlap = conceptTokens.filter((t) => md.includes(t)).length;
  const conceptOk = overlap >= Math.min(2, conceptTokens.length);
  checks.push({
    id: "concept_fit",
    ok: conceptOk,
    detail: `overlap=${overlap}`,
  });

  if (brand.quality.requireOriginalTake) {
    const hasTake = /착각|반대로|본질|프레임|내가 보는|핵심은|남들과 다르게/i.test(md);
    checks.push({
      id: "original_take",
      ok: hasTake,
      detail: hasTake ? "found opinion markers" : "missing original take markers",
    });
  }

  const slopScore = computeSlopScore(md);
  checks.push({
    id: "slop_score",
    ok: slopScore <= brand.quality.maxSlopScore,
    detail: `slop=${slopScore.toFixed(2)}, max=${brand.quality.maxSlopScore}`,
  });

  // Deceptive clickbait patterns
  const deceptive = /충격 반전|알고보니 충격|클릭하지 마세요|99%가 모르는/i.test(article.title + md);
  checks.push({
    id: "no_deceptive_bait",
    ok: !deceptive,
    detail: deceptive ? "deceptive bait language" : "ok",
  });

  const factual = passesFactualGate(article.title, md, brand.safety?.blockUnverifiedStats ?? true);
  checks.push({
    id: "factual_only",
    ok: factual.ok,
    detail: factual.detail,
  });

  const safety = platformSafetyScore(article.title, md);
  checks.push({
    id: "platform_safety",
    ok: safety.ok,
    detail: `score=${safety.score.toFixed(2)} issues=${safety.issues.join(",") || "none"}`,
  });

  const passed = checks.every((c) => c.ok);
  const score =
    checks.reduce((acc, c) => acc + (c.ok ? 1 : 0), 0) / Math.max(1, checks.length) - slopScore * 0.15;

  return {
    passed,
    score: Math.max(0, Math.min(1, score)),
    slopScore,
    checks,
  };
}

export function computeSlopScore(md: string): number {
  let hits = 0;
  for (const p of SLOP_PHRASES) {
    if (md.includes(p)) hits += 1;
  }
  const generic = (md.match(/매우|정말|아주 중요한|필수적/g) || []).length;
  const repetitionPenalty = repeatedSentenceStarts(md);
  const raw = hits * 0.08 + Math.min(0.3, generic * 0.02) + repetitionPenalty;
  return Math.max(0, Math.min(1, raw));
}

function repeatedSentenceStarts(md: string): number {
  const sentences = md
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8)
    .map((s) => s.slice(0, 6));
  const counts = new Map<string, number>();
  for (const s of sentences) counts.set(s, (counts.get(s) || 0) + 1);
  let penalty = 0;
  for (const n of counts.values()) {
    if (n >= 3) penalty += 0.08;
  }
  return Math.min(0.3, penalty);
}

function tokenize(text: string): string[] {
  return text
    .split(/[\s,/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 12);
}
