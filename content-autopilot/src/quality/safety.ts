/** Platform-safe heuristics: avoid spam-farm signals without blocking good titles. */

export function platformSafetyScore(title: string, md: string): {
  ok: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let penalty = 0;

  const exclamations = (title.match(/!/g) || []).length;
  if (exclamations >= 3) {
    issues.push("title_too_many_exclamations");
    penalty += 0.2;
  }

  // Keyword stuffing in title
  const titleWords = title.split(/\s+/).filter(Boolean);
  const dupTitle = titleWords.length - new Set(titleWords).size;
  if (dupTitle >= 2) {
    issues.push("title_repetition");
    penalty += 0.15;
  }

  // Identical paragraph blocks (copy-paste spam signal)
  const paras = md.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 40);
  const seen = new Map<string, number>();
  for (const p of paras) {
    const key = p.slice(0, 80);
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  for (const n of seen.values()) {
    if (n >= 2) {
      issues.push("duplicate_paragraphs");
      penalty += 0.4;
      break;
    }
  }

  // ALL CAPS chunks
  if (/[A-Z가-힣]{8,}/.test(title)) {
    issues.push("shouting_title");
    penalty += 0.1;
  }

  const score = Math.max(0, 1 - penalty);
  return { ok: penalty < 0.35, score, issues };
}
