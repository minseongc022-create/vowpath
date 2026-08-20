/**
 * Structure discovery. Given a raw JSON payload captured from Toss Shopping,
 * find the array that holds the product listing and propose candidate paths for
 * each canonical field. Feeds `scripts/pricepulse-probe.mjs`, which turns the
 * best proposal into a profile a human confirms.
 *
 * This is what makes a site change cheap: re-run the probe, diff the profile.
 */
import { keyPaths } from "../profile.ts";

export type FieldPattern = {
  field: string;
  /** Key-name regexes, most specific first. */
  patterns: RegExp[];
  type: "id" | "text" | "number" | "boolean" | "url";
};

export const FIELD_PATTERNS: FieldPattern[] = [
  { field: "externalId", type: "id", patterns: [/^productId$/i, /^goodsId$/i, /^itemId$/i, /^id$/i, /Id$/] },
  { field: "name", type: "text", patterns: [/^productName$/i, /^name$/i, /^title$/i, /Name$/] },
  // Nested forms (price.sale, priceInfo.finalAmount) are as common as flat ones.
  { field: "price", type: "number", patterns: [/^salePrice$/i, /^discount(ed)?Price$/i, /^finalPrice$/i, /^price$/i, /Price$/, /(^|\.)price(info)?\.(sale|sell|final|current|discount)/i, /(sale|final|current)Amount$/i] },
  { field: "listPrice", type: "number", patterns: [/^originalPrice$/i, /^listPrice$/i, /^basePrice$/i, /^retailPrice$/i, /(^|\.)price(info)?\.(orig(in|inal)?|list|base|retail)/i] },
  { field: "sellerName", type: "text", patterns: [/^sellerName$/i, /^shopName$/i, /^brandName$/i, /^storeName$/i, /seller.*name/i, /brand.*name/i, /(^|\.)(shop|store|mall|seller|brand)\.(display)?name$/i] },
  { field: "reviewCount", type: "number", patterns: [/^reviewCount$/i, /review.*count/i, /^reviewTotal/i] },
  { field: "rating", type: "number", patterns: [/^reviewScore$/i, /^rating$/i, /review.*(score|rate|avg)/i, /^score$/i] },
  { field: "imageUrl", type: "url", patterns: [/^imageUrl$/i, /^thumbnailUrl$/i, /thumbnail/i, /image/i] },
  { field: "productUrl", type: "url", patterns: [/^productUrl$/i, /^landingUrl$/i, /^linkUrl$/i, /^deepLink$/i, /^url$/i, /link/i] },
  { field: "categoryName", type: "text", patterns: [/^categoryName$/i, /category.*name/i, /^categoryPath$/i] },
  { field: "deliveryFee", type: "number", patterns: [/^deliveryFee$/i, /^shippingFee$/i, /delivery.*fee/i] },
  { field: "soldOut", type: "boolean", patterns: [/^soldOut$/i, /^isSoldOut$/i, /^outOfStock$/i, /saleStatus/i] },
];

export type ArrayCandidate = {
  path: string;
  length: number;
  score: number;
  reasons: string[];
  sampleKeys: string[];
};

export type DiscoveryProposal = {
  itemsPath: string;
  length: number;
  score: number;
  sampleKeys: string[];
  /** canonical field → candidate paths, best first. */
  fields: Record<string, string[]>;
  missingRequired: string[];
};

const MAX_DEPTH = 8;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Flat key→value pairs of an item, one level into nested objects. */
function flatEntries(item: Record<string, unknown>, depth = 0, prefix = ""): [string, unknown][] {
  const out: [string, unknown][] = [];
  for (const [key, value] of Object.entries(item)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value) && depth < 2) out.push(...flatEntries(value, depth + 1, path));
    else if (Array.isArray(value) && value.length && depth < 2) {
      const first = value[0];
      if (isPlainObject(first)) out.push(...flatEntries(first, depth + 1, `${path}[0]`));
      else out.push([`${path}[0]`, first]);
    } else out.push([path, value]);
  }
  return out;
}

function looksNumeric(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return /^\s*[\d,]+(\.\d+)?\s*원?\s*$/.test(value);
  return false;
}

function looksUrl(value: unknown): boolean {
  return typeof value === "string" && (/^https?:\/\//.test(value) || value.startsWith("/"));
}

function scoreArray(path: string, arr: unknown[]): ArrayCandidate | null {
  const objects = arr.filter(isPlainObject);
  if (objects.length < 2) return null;

  const entries = flatEntries(objects[0]);
  const keys = entries.map(([k]) => k);
  const reasons: string[] = [];
  let score = Math.min(arr.length, 60) / 2;

  const hasPrice = entries.some(([k, v]) => /price|amount/i.test(k) && looksNumeric(v));
  const hasName = entries.some(([k, v]) => /name|title/i.test(k) && typeof v === "string" && v.length > 1);
  const hasId = entries.some(([k, v]) => /(^id$)|id$/i.test(k) && (typeof v === "string" || typeof v === "number"));
  const hasImage = entries.some(([k, v]) => /image|thumb/i.test(k) && looksUrl(v));
  const hasReview = entries.some(([k]) => /review/i.test(k));

  if (hasPrice) { score += 40; reasons.push("price-like field"); }
  if (hasName) { score += 30; reasons.push("name-like field"); }
  if (hasId) { score += 20; reasons.push("id-like field"); }
  if (hasImage) { score += 10; reasons.push("image url"); }
  if (hasReview) { score += 10; reasons.push("review field"); }
  if (/product|goods|item|search|result/i.test(path)) { score += 15; reasons.push("product-ish path"); }
  if (!hasPrice && !hasName) return null;

  return { path, length: arr.length, score, reasons, sampleKeys: keys.slice(0, 60) };
}

/** Every array in the payload that could plausibly be the product listing. */
export function findItemArrays(root: unknown): ArrayCandidate[] {
  const found: ArrayCandidate[] = [];
  const visit = (node: unknown, path: string, depth: number) => {
    if (depth > MAX_DEPTH || node == null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      const candidate = scoreArray(path, node);
      if (candidate) found.push(candidate);
      if (node.length && typeof node[0] === "object") visit(node[0], `${path}[0]`, depth + 1);
      return;
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      visit(value, path ? `${path}.${key}` : key, depth + 1);
    }
  };
  visit(root, "", 0);
  return found.sort((a, b) => b.score - a.score);
}

function typeAccepts(type: FieldPattern["type"], value: unknown): boolean {
  switch (type) {
    case "number": return looksNumeric(value);
    case "boolean": return typeof value === "boolean" || /^(true|false|Y|N|SOLD_OUT|ON_SALE)$/i.test(String(value));
    case "url": return looksUrl(value);
    case "id": return (typeof value === "string" && value.length > 0) || typeof value === "number";
    case "text": return typeof value === "string" && value.trim().length > 0;
  }
}

/** Rank candidate paths for one canonical field across sample items. */
function candidatePathsFor(pattern: FieldPattern, samples: Record<string, unknown>[]): string[] {
  const scored = new Map<string, number>();
  for (const sample of samples) {
    for (const [path, value] of flatEntries(sample)) {
      const leaf = path.split(".").pop() ?? path;
      const patternIndex = pattern.patterns.findIndex((re) => re.test(leaf) || re.test(path));
      if (patternIndex < 0) continue;
      if (!typeAccepts(pattern.type, value)) continue;
      // Earlier patterns are more specific; shallower paths beat nested ones.
      const bonus = (pattern.patterns.length - patternIndex) * 10 - path.split(".").length;
      scored.set(path, (scored.get(path) ?? 0) + bonus);
    }
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).map(([path]) => path).slice(0, 4);
}

export const REQUIRED = ["externalId", "name", "price"];

/** Turn the best array candidate into a field-mapping proposal. */
export function proposeFromArray(candidate: ArrayCandidate, items: unknown[]): DiscoveryProposal {
  const samples = items.filter(isPlainObject).slice(0, 10);
  const fields: Record<string, string[]> = {};
  for (const pattern of FIELD_PATTERNS) {
    const paths = candidatePathsFor(pattern, samples);
    if (paths.length) fields[pattern.field] = paths;
  }
  return {
    itemsPath: candidate.path,
    length: candidate.length,
    score: candidate.score,
    sampleKeys: candidate.sampleKeys,
    fields,
    missingRequired: REQUIRED.filter((field) => !fields[field]?.length),
  };
}

/** One-call discovery over a whole captured payload. */
export function discover(root: unknown, limit = 3): DiscoveryProposal[] {
  const candidates = findItemArrays(root).slice(0, limit);
  const proposals: DiscoveryProposal[] = [];
  for (const candidate of candidates) {
    const items = candidate.path
      ? (pathValue(root, candidate.path) as unknown[])
      : (root as unknown[]);
    if (Array.isArray(items)) proposals.push(proposeFromArray(candidate, items));
  }
  return proposals;
}

/** Local path reader — discovery paths may contain [0] segments. */
function pathValue(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const segment of path.split(".")) {
    const match = /^([^[\]]*)((\[\d+\])*)$/.exec(segment);
    if (!match) return undefined;
    const [, key, indexes] = match;
    if (key) {
      if (current == null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    for (const idx of indexes?.match(/\d+/g) ?? []) {
      if (!Array.isArray(current)) return undefined;
      current = current[Number(idx)];
    }
  }
  return current;
}

/** Shape summary for capture files — useful in drift diffs. */
export function summarizeShape(root: unknown): string[] {
  return keyPaths(root).slice(0, 200);
}
