/**
 * Pricepulse — Toss Shopping price & rank intelligence.
 * Canonical types. Every layer (fetch → parse → collect → store) speaks these.
 */

export type SourceId = "toss-shopping";

export type TargetKind = "keyword" | "category";

/** One thing we watch every day. */
export type CollectTarget = {
  /** Stable slug — becomes the FK in every observation row. Never renumber. */
  id: string;
  kind: TargetKind;
  /** Keyword text, or category id/slug for kind="category". */
  query: string;
  label?: string;
  /** Result pages to walk. Default from config. */
  pages?: number;
  enabled?: boolean;
};

/** One product as seen in one search-result position, at one moment. */
export type CollectedItem = {
  /** Toss-side product id. Required — without it there is no time series. */
  externalId: string;
  name: string;
  /** KRW, integer. null = present in listing but price not parseable. */
  price: number | null;
  listPrice: number | null;
  sellerName: string | null;
  reviewCount: number | null;
  rating: number | null;
  imageUrl: string | null;
  productUrl: string | null;
  categoryName: string | null;
  deliveryFee: number | null;
  soldOut: boolean | null;
  /** 1-based absolute position across pages: (page - 1) * pageSize + index + 1. */
  rank: number;
  page: number;
};

export type FieldCoverage = Record<string, number>;

/** What the parser learned about the payload — the early-warning system. */
export type ParseDiagnostics = {
  itemsPathUsed: string | null;
  rawItemCount: number;
  parsedItemCount: number;
  /** field → which candidate path actually matched (first item). */
  matchedPaths: Record<string, string | null>;
  /** field → fraction of items where the field resolved. */
  coverage: FieldCoverage;
  /** Sorted key-path hash of the first item. Changes ⇒ Toss changed the shape. */
  fingerprint: string | null;
  warnings: string[];
};

export type ParseResult = {
  items: CollectedItem[];
  diagnostics: ParseDiagnostics;
};

export type TargetResult = {
  targetId: string;
  kind: TargetKind;
  query: string;
  pagesFetched: number;
  itemCount: number;
  ok: boolean;
  error?: string;
  diagnostics: ParseDiagnostics | null;
  /** Populated when the store is live. */
  storedCount?: number;
  durationMs: number;
};

export type CollectionRun = {
  runId: string;
  source: SourceId;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  dryRun: boolean;
  targets: TargetResult[];
  totals: {
    targets: number;
    okTargets: number;
    failedTargets: number;
    items: number;
    stored: number;
  };
  alerts: string[];
};

/** Health verdict for one target's parse — drives alerting. */
export type HealthVerdict = {
  ok: boolean;
  severity: "ok" | "warn" | "critical";
  reasons: string[];
};
