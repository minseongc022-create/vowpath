import type { ArticleDraft, Brand } from "../config/types.ts";
import { chatText } from "./llm.ts";
import { countKoreanishChars, markdownToHtml, slugify } from "../lib/utils.ts";

export async function factCheckDraft(brand: Brand, draft: ArticleDraft): Promise<ArticleDraft> {
  if (!brand.safety?.requireFactualOnly) return draft;
  if (process.env.MOCK_LLM === "1" || !process.env.LLM_API_KEY) {
    return draft; // mock path already factual
  }

  const md = await chatText({
    system: `You are a Korean fact-check editor for personal blogs.
Rewrite the article to be STRICTLY factual and platform-safe.

Rules:
- Remove ANY unverified news, quotes, statistics, celebrity claims, or "속보/단독" framing.
- Keep compelling title hooks that are honest (curiosity OK, lies NOT OK).
- Do NOT invent numbers, dates, official announcements, or expert quotes.
- Prefer general principles, checklists, and clearly labeled examples ("예를 들어", "가령").
- Keep length at or above ${brand.quality.minChars} Korean chars (rough, no spaces).
- Korean language. Output markdown only starting with # title.`,
    user: `Fact-check and fix this draft. Remove fabrication risk; keep usefulness.

Title angle intent: ${draft.title}

Draft:
\`\`\`
${draft.markdown}
\`\`\`
`,
    temperature: 0.2,
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
  return md
    .replace(/^#.+$/gm, "")
    .replace(/[#>*_`]/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 180);
}
