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
