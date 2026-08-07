import type { Brand, ProduceResult } from "../config/types.ts";
import { selectTopics } from "../topics/selector.ts";
import { buildResearchBrief } from "../writers/research.ts";
import { humanizeDraft, writeLongForm } from "../writers/draft.ts";
import { evaluateQuality } from "../quality/gate.ts";
import { publishArticle } from "../publishers/index.ts";
import { log } from "../lib/utils.ts";

export async function produceOne(brand: Brand, opts?: { publish?: boolean; maxAttempts?: number }): Promise<ProduceResult> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  const topics = await selectTopics(brand, 4);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const topic = topics[Math.min(attempt - 1, topics.length - 1)];
    log("info", `Producing ${brand.id} attempt ${attempt}: ${topic.titleAngle}`);
    try {
      const brief = await buildResearchBrief(brand, topic);
      let article = await writeLongForm(brand, brief);
      article = await humanizeDraft(brand, article);
      let quality = evaluateQuality(brand, article);

      // One repair pass if failed
      if (!quality.passed) {
        log("warn", `Quality gate failed`, quality.checks.filter((c) => !c.ok));
        article = await writeLongForm(brand, {
          ...brief,
          uniqueAngles: [
            ...brief.uniqueAngles,
            "이전 초안 품질 미달: 구체 예시·실행 체크리스트·독창적 관점을 더 강화할 것",
          ],
        });
        article = await humanizeDraft(brand, article);
        quality = evaluateQuality(brand, article);
      }

      if (!quality.passed) {
        lastError = new Error(`Quality gate still failing for ${brand.id}`);
        continue;
      }

      const result: ProduceResult = {
        brandId: brand.id,
        topic,
        article,
        quality,
        attempts: attempt,
      };

      if (opts?.publish !== false) {
        result.published = await publishArticle(brand, article);
      }
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      log("error", `Attempt failed: ${lastError.message}`);
    }
  }

  throw lastError || new Error(`Failed to produce article for ${brand.id}`);
}

export async function runNightly(brands: Brand[], postsPerBrand = 1): Promise<ProduceResult[]> {
  const results: ProduceResult[] = [];
  for (const brand of brands) {
    for (let i = 0; i < postsPerBrand; i++) {
      const produced = await produceOne(brand, { publish: true, maxAttempts: 3 });
      results.push(produced);
      log("info", `Published ${brand.id}: ${produced.article.title}`, produced.published);
    }
  }
  return results;
}
