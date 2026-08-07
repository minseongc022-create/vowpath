import type { ArticleDraft, Brand, ResearchBrief } from "../config/types.ts";
import { chatText } from "./llm.ts";
import { countKoreanishChars, markdownToHtml, slugify } from "../lib/utils.ts";

export async function writeLongForm(brand: Brand, brief: ResearchBrief): Promise<ArticleDraft> {
  const md = await chatText({
    system: `You are a senior Korean editorial writer for a niche blog.
Write a long-form article that feels carefully crafted by a human expert, NOT mass-produced AI slop.

Hard rules:
- Match the brand concept and voice exactly.
- Korean language.
- Long, useful, specific: real examples, frameworks, checklists.
- Compelling hook in the first 2 paragraphs (curiosity OK; deception NOT OK).
- No celebrity gossip, no privacy invasion, no full news reprint.
- Avoid banned AI tells: "결론적으로", "다양한 방법", "이번 포스팅에서는", "많은 사람들이", empty hype.
- Use ## / ### headings, short paragraphs, concrete numbers where honest.
- Include an original take section and a clear next-actions section.
- Output markdown only, starting with # title.`,
    user: `Write the full article.

Brand voice: ${JSON.stringify(brand.voice)}
Audience: ${brand.audience}
Concept: ${brand.concept}
Min chars (no spaces rough): ${brand.quality.minChars}
Min sections: ${brand.quality.minSections}

ResearchBrief:
${JSON.stringify(brief, null, 2)}

titleAngle: "${brief.topic.titleAngle}"
`,
    temperature: 0.55,
  });

  const title = extractTitle(md) || brief.topic.titleAngle;
  const body = md.trim();
  const excerpt = buildExcerpt(body);
  return {
    brandId: brand.id,
    title,
    slug: slugify(title),
    excerpt,
    markdown: body,
    html: markdownToHtml(body),
    tags: [...brand.publishing.tags, brief.topic.pillar].filter(Boolean),
    metaDescription: excerpt.slice(0, 140),
    wordCount: body.split(/\s+/).filter(Boolean).length,
    charCount: countKoreanishChars(body),
  };
}

export async function humanizeDraft(brand: Brand, draft: ArticleDraft): Promise<ArticleDraft> {
  const md = await chatText({
    system: `You humanize Korean blog drafts.
Keep facts and structure. Remove AI-sounding filler.
Tighten weak transitions. Keep it sounding like an experienced practitioner.
Do not shorten below usefulness. Output markdown only.`,
    user: `Brand mustSoundLike: ${brand.voice.mustSoundLike}
Banned phrases: ${brand.voice.bannedPhrases.join(", ")}

humanize this draft:
\`\`\`
${draft.markdown}
\`\`\`
`,
    temperature: 0.4,
  });

  const body = md.trim();
  const title = extractTitle(body) || draft.title;
  return {
    ...draft,
    title,
    slug: slugify(title),
    markdown: body,
    html: markdownToHtml(body),
    excerpt: buildExcerpt(body),
    metaDescription: buildExcerpt(body).slice(0, 140),
    wordCount: body.split(/\s+/).filter(Boolean).length,
    charCount: countKoreanishChars(body),
  };
}

function extractTitle(md: string): string | null {
  const m = md.match(/^#\s+(.+)$/m);
  return m?.[1]?.trim() || null;
}

function buildExcerpt(md: string): string {
  const text = md
    .replace(/^#.+$/gm, "")
    .replace(/[#>*_`]/g, "")
    .replace(/\n+/g, " ")
    .trim();
  return text.slice(0, 180);
}
