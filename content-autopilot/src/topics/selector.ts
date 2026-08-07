import type { Brand, TopicCandidate } from "../config/types.ts";
import { chatJson } from "../writers/llm.ts";

export async function selectTopics(brand: Brand, count = 3): Promise<TopicCandidate[]> {
  const result = await chatJson<{ candidates: TopicCandidate[] }>({
    system: `You are a topic selector for a Korean long-form blog.
Pick topics that match the brand concept tightly.
Prefer evergreen + timely practical angles over raw breaking news rewrite.
Hooks should be curiosity-driven but NOT deceptive clickbait lies.
No celebrity gossip, no privacy invasion, no scraped news regurgitation.
Return JSON: { "candidates": TopicCandidate[] }
Each candidate needs: titleAngle, searchIntent, pillar, hook, whyNow, outlinePromise[], score(0-1).`,
    user: JSON.stringify(
      {
        brand: {
          id: brand.id,
          concept: brand.concept,
          audience: brand.audience,
          pillars: brand.topics.pillars,
          seedQueries: brand.topics.seedQueries,
          avoid: brand.topics.avoid,
        },
        count,
        locale: brand.publishing.locale,
      },
      null,
      2
    ),
    temperature: 0.6,
  });

  const ranked = (result.candidates || [])
    .map((c) => ({ ...c, score: scoreTopic(brand, c) }))
    .filter((c) => c.score >= 0.55)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    throw new Error(`No valid topics for brand ${brand.id}`);
  }
  return ranked.slice(0, count);
}

export function scoreTopic(brand: Brand, topic: TopicCandidate): number {
  let score = typeof topic.score === "number" ? topic.score : 0.5;
  const blob = `${topic.titleAngle} ${topic.searchIntent} ${topic.hook} ${topic.pillar}`.toLowerCase();

  for (const pillar of brand.topics.pillars) {
    if (blob.includes(pillar.toLowerCase()) || topic.pillar.includes(pillar)) {
      score += 0.08;
    }
  }
  for (const avoid of brand.topics.avoid) {
    if (blob.includes(avoid.toLowerCase())) score -= 0.35;
  }

  // Penalize pure news-dump / gossip patterns
  const bad = ["속보", "충격", "결국 이혼", "몰카", "신상", "단독 입수"];
  for (const b of bad) {
    if (blob.includes(b)) score -= 0.25;
  }

  // Reward practical intent
  const good = ["방법", "체크리스트", "구조", "실전", "가이드", "비교", "계산"];
  for (const g of good) {
    if (blob.includes(g)) score += 0.04;
  }

  if (!topic.outlinePromise?.length) score -= 0.2;
  return Math.max(0, Math.min(1, score));
}
