/**
 * THE parsing chokepoint. Every product row that ever reaches the database
 * comes through `parseSearchPayload`. One file to fix when Toss changes; one
 * file to test against fixtures; one place that decides "this parse is
 * healthy" so a silent breakage becomes a pager, not a gap in the history.
 */
import type {
  CollectedItem,
  HealthVerdict,
  ParseDiagnostics,
  ParseResult,
} from "../types.ts";
import {
  getPath,
  resolveField,
  shapeFingerprint,
  type SourceProfile,
} from "../profile.ts";
import { toAbsoluteUrl, toBool, toFloat, toId, toInt, toText } from "../normalize.ts";
import { discover } from "./discover.ts";
import { extractEmbeddedJson } from "./html.ts";

export type ParseOptions = {
  profile: SourceProfile;
  /** 1-based result page this payload came from. */
  page: number;
  /** Used only for the product URL fallback. */
  keyword?: string;
};

/** Minimum share of items that must carry a field before we trust the parse. */
export const COVERAGE_FLOOR: Record<string, number> = {
  externalId: 0.95,
  name: 0.95,
  price: 0.8,
};

const ACCEPT_ANY = (value: unknown) => value !== "" && value !== undefined && value !== null;

function firstArray(payload: unknown, candidates: string[]): { items: unknown[]; path: string } | null {
  for (const path of candidates) {
    const value = getPath(payload, path);
    if (Array.isArray(value) && value.length > 0) return { items: value, path };
  }
  return null;
}

function mapItem(
  raw: unknown,
  profile: SourceProfile,
  rank: number,
  page: number,
  matched: Record<string, string | null>,
): CollectedItem | null {
  const fields = profile.search.fields;
  const pick = (field: string) => {
    const candidates = fields[field] ?? [];
    const { value, path } = resolveField(raw, candidates, ACCEPT_ANY);
    if (matched[field] === undefined || matched[field] === null) matched[field] = path;
    return value;
  };

  const externalId = toId(pick("externalId"));
  const name = toText(pick("name"));
  // No id or no name ⇒ not a product row (ads, banners, section headers).
  if (!externalId || !name) return null;

  return {
    externalId,
    name,
    price: toInt(pick("price")),
    listPrice: toInt(pick("listPrice")),
    sellerName: toText(pick("sellerName")),
    reviewCount: toInt(pick("reviewCount")),
    rating: toFloat(pick("rating")),
    imageUrl: toAbsoluteUrl(pick("imageUrl"), profile.search.urlBase),
    productUrl: toAbsoluteUrl(pick("productUrl"), profile.search.urlBase),
    categoryName: toText(pick("categoryName")),
    deliveryFee: toInt(pick("deliveryFee")),
    soldOut: toBool(pick("soldOut")),
    rank,
    page,
  };
}

function coverageOf(items: CollectedItem[]): Record<string, number> {
  if (!items.length) return {};
  const keys: (keyof CollectedItem)[] = [
    "externalId", "name", "price", "listPrice", "sellerName",
    "reviewCount", "rating", "imageUrl", "productUrl", "soldOut",
  ];
  const coverage: Record<string, number> = {};
  for (const key of keys) {
    const present = items.filter((item) => item[key] !== null && item[key] !== undefined).length;
    coverage[key] = Number((present / items.length).toFixed(3));
  }
  return coverage;
}

/**
 * Parse one search-result payload (already-parsed JSON, or raw HTML when the
 * profile says the listing is embedded in the document).
 */
export function parseSearchPayload(payload: unknown, options: ParseOptions): ParseResult {
  const { profile, page } = options;
  const warnings: string[] = [];
  const matched: Record<string, string | null> = {};

  let root = payload;
  if (typeof payload === "string") {
    const embedded = extractEmbeddedJson(payload);
    const hit = embedded.find((entry) => firstArray(entry.value, profile.search.itemsPath));
    if (hit) {
      root = hit.value;
      warnings.push(`listing read from embedded JSON (${hit.source})`);
    } else if (embedded.length) {
      // Nothing matched the profile — let discovery speak so the alert is useful.
      const proposals = embedded.flatMap((entry) => discover(entry.value, 1));
      const best = proposals.sort((a, b) => b.score - a.score)[0];
      if (best) {
        warnings.push(
          `profile itemsPath did not match embedded JSON; discovery suggests "${best.itemsPath}" (${best.length} items)`,
        );
      }
      root = embedded[0].value;
    }
  }

  const found = firstArray(root, profile.search.itemsPath);
  if (!found) {
    const best = discover(root, 1)[0];
    if (best) {
      warnings.push(
        `profile itemsPath [${profile.search.itemsPath.join(", ")}] matched nothing; discovery suggests "${best.itemsPath}" (${best.length} items, score ${best.score.toFixed(0)})`,
      );
    } else {
      warnings.push("no product-shaped array found in payload");
    }
    return {
      items: [],
      diagnostics: {
        itemsPathUsed: null,
        rawItemCount: 0,
        parsedItemCount: 0,
        matchedPaths: {},
        coverage: {},
        fingerprint: null,
        warnings,
      },
    };
  }

  const pageSize = profile.search.pageSize;
  const items: CollectedItem[] = [];
  const seen = new Set<string>();
  found.items.forEach((raw, index) => {
    const rank = (page - 1) * pageSize + index + 1;
    const item = mapItem(raw, profile, rank, page, matched);
    if (!item) return;
    if (seen.has(item.externalId)) return; // Same product twice on a page ⇒ keep the higher rank.
    seen.add(item.externalId);
    items.push(item);
  });

  if (items.length < found.items.length) {
    warnings.push(`${found.items.length - items.length}/${found.items.length} rows skipped (missing id or name)`);
  }

  const coverage = coverageOf(items);
  for (const [field, floor] of Object.entries(COVERAGE_FLOOR)) {
    const value = coverage[field];
    if (items.length && value !== undefined && value < floor) {
      warnings.push(`low coverage: ${field} ${(value * 100).toFixed(0)}% < ${(floor * 100).toFixed(0)}%`);
    }
  }

  return {
    items,
    diagnostics: {
      itemsPathUsed: found.path,
      rawItemCount: found.items.length,
      parsedItemCount: items.length,
      matchedPaths: matched,
      coverage,
      fingerprint: shapeFingerprint(found.items[0]),
      warnings,
    },
  };
}

/**
 * Turn diagnostics into an alertable verdict. Deliberately strict: an empty
 * result set is critical, because "0 items" is exactly what a broken parser
 * looks like, and a day of silence is a permanent hole in the price history.
 */
export function evaluateHealth(
  diagnostics: ParseDiagnostics,
  options: { previousFingerprint?: string | null; minItems?: number } = {},
): HealthVerdict {
  const minItems = options.minItems ?? 1;
  const reasons: string[] = [];
  let severity: HealthVerdict["severity"] = "ok";

  if (diagnostics.parsedItemCount < minItems) {
    reasons.push(`parsed ${diagnostics.parsedItemCount} items (expected >= ${minItems})`);
    severity = "critical";
  }
  for (const [field, floor] of Object.entries(COVERAGE_FLOOR)) {
    const value = diagnostics.coverage[field];
    if (value !== undefined && value < floor) {
      reasons.push(`${field} coverage ${(value * 100).toFixed(0)}% below ${(floor * 100).toFixed(0)}%`);
      severity = "critical";
    }
  }
  if (
    options.previousFingerprint &&
    diagnostics.fingerprint &&
    options.previousFingerprint !== diagnostics.fingerprint
  ) {
    reasons.push(
      `payload shape changed (${options.previousFingerprint} → ${diagnostics.fingerprint}) — re-run the probe before trusting this data`,
    );
    if (severity === "ok") severity = "warn";
  }

  return { ok: severity !== "critical", severity, reasons };
}
