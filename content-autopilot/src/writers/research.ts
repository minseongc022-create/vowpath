import type { Brand, ResearchBrief, TopicCandidate } from "../config/types.ts";
import { chatJson } from "../writers/llm.ts";

export async function buildResearchBrief(brand: Brand, topic: TopicCandidate): Promise<ResearchBrief> {
  const data = await chatJson<Omit<ResearchBrief, "topic">>({
    system: `You create a research brief for original long-form Korean blog posts.
Do NOT paste copyrighted news body text.
Focus on frameworks, reader pains, original angles, and actionable steps.
Return JSON fields: keyFacts[], readerPain[], uniqueAngles[], actionFramework[], sourcesNote.`,
    user: JSON.stringify({
      brandConcept: brand.concept,
      audience: brand.audience,
      topic,
      label: "ResearchBrief",
    }),
    temperature: 0.3,
  });

  return { topic, ...data };
}
