import type { EstimateLineCategory, EstimateLineItem, EstimateLineUnit } from "./estimate-document";
import { newLineItem } from "./estimate-document";
import type { ShopVertical } from "./shop-vertical";

export type EstimatePreset = {
  id: string;
  label: string;
  category: EstimateLineCategory;
  unit: EstimateLineUnit;
  /** Suggest only — shops edit live rates. In cents. */
  defaultUnitPriceCents: number;
  description: string;
};

/**
 * Presets grounded in common independent-shop / insurance-adjacent practice.
 * Restoration items mirror typical water-mitigation scopes (extraction, drying
 * equipment per day, demo, antimicrobial) — not a full Xactimate price list.
 * HVAC items mirror residential service/replace proposal structure
 * (diagnostic, equipment, materials, labor, permit, disposal).
 */
export const RESTORATION_ESTIMATE_PRESETS: EstimatePreset[] = [
  {
    id: "rest-inspect",
    label: "Moisture inspection & mapping",
    category: "labor",
    unit: "ls",
    defaultUnitPriceCents: 17500,
    description: "Moisture inspection & mapping (IICRC-aligned)",
  },
  {
    id: "rest-extract",
    label: "Water extraction",
    category: "labor",
    unit: "sf",
    defaultUnitPriceCents: 85,
    description: "Water extraction — affected floor area",
  },
  {
    id: "rest-airmover",
    label: "Air mover (per day)",
    category: "equipment",
    unit: "day",
    defaultUnitPriceCents: 4500,
    description: "Air mover rental / deployment",
  },
  {
    id: "rest-dehu",
    label: "Dehumidifier (per day)",
    category: "equipment",
    unit: "day",
    defaultUnitPriceCents: 9500,
    description: "LGR dehumidifier rental / deployment",
  },
  {
    id: "rest-scrubber",
    label: "Air scrubber (per day)",
    category: "equipment",
    unit: "day",
    defaultUnitPriceCents: 7500,
    description: "Air scrubber / negative air (per day)",
  },
  {
    id: "rest-demo-drywall",
    label: "Drywall cut & remove",
    category: "labor",
    unit: "sf",
    defaultUnitPriceCents: 325,
    description: "Drywall cut, remove, and bag for disposal",
  },
  {
    id: "rest-baseboard",
    label: "Baseboard remove",
    category: "labor",
    unit: "lf",
    defaultUnitPriceCents: 275,
    description: "Baseboard / trim removal",
  },
  {
    id: "rest-antimicrobial",
    label: "Antimicrobial application",
    category: "materials",
    unit: "sf",
    defaultUnitPriceCents: 65,
    description: "Antimicrobial application to affected surfaces",
  },
  {
    id: "rest-containment",
    label: "Containment barrier",
    category: "labor",
    unit: "ls",
    defaultUnitPriceCents: 25000,
    description: "Containment barrier install / poly & zip wall",
  },
  {
    id: "rest-afterhours",
    label: "After-hours emergency call-out",
    category: "fees",
    unit: "ea",
    defaultUnitPriceCents: 19500,
    description: "After-hours / emergency response call-out",
  },
  {
    id: "rest-packout",
    label: "Content pack-out",
    category: "labor",
    unit: "ls",
    defaultUnitPriceCents: 45000,
    description: "Content pack-out (labor — storage billed separately if needed)",
  },
];

export const HVAC_ESTIMATE_PRESETS: EstimatePreset[] = [
  {
    id: "hvac-diag",
    label: "Diagnostic / service call",
    category: "fees",
    unit: "ea",
    defaultUnitPriceCents: 12900,
    description: "Diagnostic / service call",
  },
  {
    id: "hvac-labor",
    label: "Service labor",
    category: "labor",
    unit: "hr",
    defaultUnitPriceCents: 12500,
    description: "HVAC service labor",
  },
  {
    id: "hvac-install-labor",
    label: "Install labor",
    category: "labor",
    unit: "hr",
    defaultUnitPriceCents: 11000,
    description: "Installation labor",
  },
  {
    id: "hvac-condenser",
    label: "Outdoor condenser / heat pump",
    category: "materials",
    unit: "ea",
    defaultUnitPriceCents: 245000,
    description: "Outdoor condenser / heat pump (make/model TBD)",
  },
  {
    id: "hvac-furnace",
    label: "Furnace / air handler",
    category: "materials",
    unit: "ea",
    defaultUnitPriceCents: 220000,
    description: "Furnace / air handler (make/model TBD)",
  },
  {
    id: "hvac-coil",
    label: "Evaporator coil",
    category: "materials",
    unit: "ea",
    defaultUnitPriceCents: 78500,
    description: "Matching evaporator coil",
  },
  {
    id: "hvac-lineset",
    label: "Line set & accessories",
    category: "materials",
    unit: "ls",
    defaultUnitPriceCents: 38500,
    description: "Line set, pad, drain, fittings & accessories",
  },
  {
    id: "hvac-thermostat",
    label: "Thermostat",
    category: "materials",
    unit: "ea",
    defaultUnitPriceCents: 17500,
    description: "Thermostat (programmable / Wi-Fi)",
  },
  {
    id: "hvac-refrigerant",
    label: "Refrigerant charge",
    category: "materials",
    unit: "ea",
    defaultUnitPriceCents: 18500,
    description: "Refrigerant charge / top-off",
  },
  {
    id: "hvac-permit",
    label: "Permit & inspection",
    category: "fees",
    unit: "ea",
    defaultUnitPriceCents: 25000,
    description: "Permit and inspection allowance",
  },
  {
    id: "hvac-disposal",
    label: "Old equipment disposal",
    category: "fees",
    unit: "ea",
    defaultUnitPriceCents: 15000,
    description: "Old equipment removal and disposal",
  },
  {
    id: "hvac-startup",
    label: "Startup & commissioning",
    category: "labor",
    unit: "ls",
    defaultUnitPriceCents: 22500,
    description: "Startup, testing, and commissioning",
  },
];

export function presetsForVertical(vertical?: ShopVertical | null): EstimatePreset[] {
  if (vertical === "hvac") return HVAC_ESTIMATE_PRESETS;
  return RESTORATION_ESTIMATE_PRESETS;
}

export function lineFromPreset(preset: EstimatePreset): EstimateLineItem {
  return newLineItem({
    category: preset.category,
    description: preset.description,
    qty: 1,
    unit: preset.unit,
    unitPriceCents: preset.defaultUnitPriceCents,
  });
}

export type EstimatePackage = {
  id: string;
  label: string;
  subtitle: string;
  presetIds: string[];
};

/** One-tap scopes shops already sell — same structure as ST / Jobber proposals. */
export const HVAC_PROPOSAL_PACKAGES: EstimatePackage[] = [
  {
    id: "hvac-replace",
    label: "AC / heat pump changeout",
    subtitle: "Diagnostic + equipment + install + permit",
    presetIds: [
      "hvac-diag",
      "hvac-condenser",
      "hvac-coil",
      "hvac-lineset",
      "hvac-install-labor",
      "hvac-startup",
      "hvac-permit",
      "hvac-disposal",
    ],
  },
  {
    id: "hvac-repair",
    label: "Service call + repair",
    subtitle: "Diagnostic + hourly labor",
    presetIds: ["hvac-diag", "hvac-labor"],
  },
  {
    id: "hvac-no-heat",
    label: "No-heat / no-cool visit",
    subtitle: "Diagnostic + 2 hrs labor",
    presetIds: ["hvac-diag", "hvac-labor"],
  },
];

export const RESTORATION_PROPOSAL_PACKAGES: EstimatePackage[] = [
  {
    id: "rest-water-day1",
    label: "Water mitigation — Day 1",
    subtitle: "Inspect + extract + dry equipment",
    presetIds: [
      "rest-inspect",
      "rest-extract",
      "rest-airmover",
      "rest-dehu",
      "rest-antimicrobial",
    ],
  },
  {
    id: "rest-sewage",
    label: "Sewage / Category 3",
    subtitle: "Inspect + containment + PPE allowance",
    presetIds: ["rest-inspect", "rest-containment", "rest-afterhours", "rest-demo-drywall"],
  },
  {
    id: "rest-packout",
    label: "Pack-out scope",
    subtitle: "Contents + labor",
    presetIds: ["rest-inspect", "rest-packout"],
  },
];

export function packagesForVertical(vertical?: ShopVertical | null): EstimatePackage[] {
  return vertical === "hvac" ? HVAC_PROPOSAL_PACKAGES : RESTORATION_PROPOSAL_PACKAGES;
}

export function linesFromPackage(
  pkg: EstimatePackage,
  presets: EstimatePreset[],
): EstimateLineItem[] {
  const byId = new Map(presets.map((p) => [p.id, p]));
  const lines: EstimateLineItem[] = [];
  for (const id of pkg.presetIds) {
    const preset = byId.get(id);
    if (preset) lines.push(lineFromPreset(preset));
  }
  if (pkg.id === "hvac-no-heat") {
    const labor = lines.find((l) => l.description.includes("service labor"));
    if (labor) labor.qty = 2;
  }
  return lines;
}

/** First row on a blank worksheet — matches how techs start a paper quote. */
export function starterLinesForVertical(
  vertical?: ShopVertical | null,
  opts?: { laborRateCents?: number },
): EstimateLineItem[] {
  const presets = presetsForVertical(vertical);
  const laborRate = opts?.laborRateCents && opts.laborRateCents > 0 ? opts.laborRateCents : undefined;
  if (vertical === "hvac") {
    const diag = presets.find((p) => p.id === "hvac-diag");
    const labor = presets.find((p) => p.id === "hvac-labor");
    const lines: EstimateLineItem[] = [];
    if (diag) lines.push(lineFromPreset(diag));
    if (labor) {
      const row = lineFromPreset(labor);
      if (laborRate) row.unitPriceCents = laborRate;
      lines.push(row);
    }
    return lines;
  }
  const inspect = presets.find((p) => p.id === "rest-inspect");
  return inspect ? [lineFromPreset(inspect)] : [];
}
