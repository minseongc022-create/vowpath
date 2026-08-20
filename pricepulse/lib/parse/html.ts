/**
 * HTML → embedded JSON. Toss Shopping is a JS app, so when there is no clean
 * JSON endpoint the listing still ships inside the document (Next.js payloads,
 * inline application/json scripts). Extract it here rather than writing CSS
 * selectors — markup changes weekly, data payloads change rarely.
 */

export type EmbeddedJson = { source: string; value: unknown };

const MAX_CANDIDATES = 40;
const MIN_CHUNK = 80;

function safeParse(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** <script id="__NEXT_DATA__" type="application/json"> */
export function extractNextData(html: string): EmbeddedJson[] {
  const out: EmbeddedJson[] = [];
  const re = /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    const value = safeParse(match[1].trim());
    if (value !== undefined) out.push({ source: "__NEXT_DATA__", value });
  }
  return out;
}

/** Any <script type="application/json"> / ld+json block. */
export function extractJsonScripts(html: string): EmbeddedJson[] {
  const out: EmbeddedJson[] = [];
  const re = /<script[^>]*type=["']application\/(ld\+)?json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let index = 0;
  for (const match of html.matchAll(re)) {
    const value = safeParse(match[2].trim());
    if (value !== undefined) out.push({ source: `script[json]#${index++}`, value });
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

/**
 * Balanced-brace scan: pulls parseable JSON objects/arrays out of arbitrary
 * script text (React Server Component flight chunks, hydration blobs).
 * `mustInclude` keeps the noise down — only chunks mentioning it are kept.
 */
export function scanBalancedJson(text: string, mustInclude: string[] = []): EmbeddedJson[] {
  const out: EmbeddedJson[] = [];
  let cursor = 0;
  while (cursor < text.length && out.length < MAX_CANDIDATES) {
    const start = text.indexOf('{"', cursor);
    if (start < 0) break;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end < 0) break;
    const slice = text.slice(start, end);
    cursor = end;
    if (slice.length < MIN_CHUNK) continue;
    if (mustInclude.length && !mustInclude.some((needle) => slice.includes(needle))) continue;
    const value = safeParse(slice);
    if (value !== undefined) out.push({ source: `inline@${start}`, value });
  }
  return out;
}

/** Next.js flight chunks: self.__next_f.push([1,"…escaped json…"]) */
export function extractFlightChunks(html: string, mustInclude: string[] = []): EmbeddedJson[] {
  const pieces: string[] = [];
  const re = /self\.__next_f\.push\(\[\d+\s*,\s*"([\s\S]*?)"\]\)/g;
  for (const match of html.matchAll(re)) {
    const decoded = safeParse(`"${match[1]}"`);
    if (typeof decoded === "string") pieces.push(decoded);
  }
  if (!pieces.length) return [];
  return scanBalancedJson(pieces.join(""), mustInclude).map((entry, index) => ({
    source: `__next_f#${index}`,
    value: entry.value,
  }));
}

/** All embedded JSON worth trying, best-structured sources first. */
export function extractEmbeddedJson(html: string, mustInclude = ["price", "Price", "상품"]): EmbeddedJson[] {
  return [
    ...extractNextData(html),
    ...extractJsonScripts(html),
    ...extractFlightChunks(html, mustInclude),
    ...scanBalancedJson(html, mustInclude).slice(0, 10),
  ];
}
