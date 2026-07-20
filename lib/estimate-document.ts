/** On-site / truck estimate document — mirrors what shops put on real quotes. */

export type EstimateLineCategory =
  | "labor"
  | "materials"
  | "equipment"
  | "fees"
  | "other";

export type EstimateLineUnit =
  | "ea"
  | "hr"
  | "day"
  | "sf"
  | "lf"
  | "ls";

export type EstimateLineItem = {
  id: string;
  category: EstimateLineCategory;
  description: string;
  qty: number;
  unit: EstimateLineUnit;
  unitPriceCents: number;
};

export type EstimateShopSnapshot = {
  shopName: string;
  phone?: string;
  email?: string;
  businessAddress?: string;
  licenseNumber?: string;
  iicrcFirmNumber?: string;
};

export type EstimateDocument = {
  id: string;
  number: string;
  issuedAt: string;
  validUntil: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  /** Restoration / insurance jobs */
  insuranceCarrier?: string;
  claimNumber?: string;
  adjusterName?: string;
  scopeSummary?: string;
  lineItems: EstimateLineItem[];
  taxRatePercent: number;
  notes?: string;
  exclusions?: string;
  shop: EstimateShopSnapshot;
  shareToken?: string;
  status: "draft" | "sent" | "accepted" | "declined";
  sentAt?: string;
  acceptedAt?: string;
  updatedAt: string;
};

export function newLineItem(
  partial?: Partial<EstimateLineItem>,
): EstimateLineItem {
  return {
    id: crypto.randomUUID(),
    category: partial?.category ?? "labor",
    description: partial?.description ?? "",
    qty: partial?.qty ?? 1,
    unit: partial?.unit ?? "ea",
    unitPriceCents: partial?.unitPriceCents ?? 0,
  };
}

export function lineTotalCents(line: EstimateLineItem): number {
  const qty = Number.isFinite(line.qty) ? line.qty : 0;
  const price = Number.isFinite(line.unitPriceCents) ? line.unitPriceCents : 0;
  return Math.round(qty * price);
}

export function computeEstimateTotals(doc: Pick<EstimateDocument, "lineItems" | "taxRatePercent">) {
  const subtotalCents = doc.lineItems.reduce((sum, line) => sum + lineTotalCents(line), 0);
  const rate = Math.max(0, Math.min(30, Number(doc.taxRatePercent) || 0));
  const taxCents = Math.round(subtotalCents * (rate / 100));
  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    taxRatePercent: rate,
  };
}

export function formatUsdFromCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function makeEstimateNumber(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EST-${y}${m}${d}-${suffix}`;
}

export function defaultValidUntil(issuedAt: string, validityDays = 14): string {
  const days = Math.max(1, Math.min(90, validityDays));
  const base = new Date(issuedAt);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

export const DEFAULT_ESTIMATE_EXCLUSIONS =
  "Excludes unforeseen conditions, electrical panel upgrades, structural repairs not listed, drywall finish beyond listed demo/cut-outs, and any work requiring specialty permits unless itemized above.";

export const DEFAULT_ESTIMATE_NOTES =
  "This estimate is based on visible conditions at the time of inspection. Final invoicing may adjust for equipment days, moisture readings, and approved change orders.";

export function categoryLabel(cat: EstimateLineCategory): string {
  switch (cat) {
    case "labor":
      return "Labor";
    case "materials":
      return "Materials";
    case "equipment":
      return "Equipment";
    case "fees":
      return "Fees / permits";
    default:
      return "Other";
  }
}

export function unitLabel(unit: EstimateLineUnit): string {
  switch (unit) {
    case "hr":
      return "hr";
    case "day":
      return "day";
    case "sf":
      return "sq ft";
    case "lf":
      return "lin ft";
    case "ls":
      return "lump sum";
    default:
      return "ea";
  }
}

