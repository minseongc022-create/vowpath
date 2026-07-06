import type { ShopVertical } from "./shop-vertical.js";

export type OptionalIntakeField = {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "checkbox" | "choice";
  /** Required when type is "choice" — spoken/DTMF options in order (option 1 = digit "1", etc). */
  choices?: string[];
  /** Spoken question for the phone AI. Falls back to `label` if omitted. */
  askPrompt?: string;
  /** Whether the phone AI actively asks this field after the 4 mandatory fields are
   * collected (vs. text-only fields that are extracted opportunistically if mentioned,
   * but never explicitly asked, to keep the call short). */
  askOnCall?: boolean;
};

export type VerticalDispatchPolicy = {
  /** Issue text patterns (lowercase) that always trigger owner hold — safety-critical */
  holdPatterns: RegExp;
  /** Issue text patterns for P1 auto-dispatch (if confidence + address OK) */
  autoP1Patterns: RegExp | null;
};

export type VerticalConfig = {
  label: string;
  shortLabel: string;
  icon: string;
  tagline: string;
  /** Default avgJobTicketUsd for new shop settings (used only as settings default, NOT dashboard revenue) */
  defaultAvgJobTicketUsd: number;
  /** Short examples for the intake portal issue placeholder */
  issueExamples: string[];
  /** Context sentence injected into the emergency-detection system prompt */
  emergencyDetectionContext: string;
  /** Optional intake fields shown in the link-intake form for this vertical */
  optionalIntakeFields: OptionalIntakeField[];
  dispatchPolicy: VerticalDispatchPolicy;
};

const RESTORATION_CONFIG: VerticalConfig = {
  label: "Water / Fire / Mold Restoration",
  shortLabel: "Restoration",
  icon: "💧",
  tagline: "Answer every 2 AM call. Dispatch crews the moment a loss is verified.",
  defaultAvgJobTicketUsd: 8000,
  issueExamples: [
    "Basement flooding from burst pipe",
    "Water through ceiling",
    "Fire damage / smoke",
    "Mold in bathroom",
    "Sewage backup",
  ],
  emergencyDetectionContext:
    "US water, fire, and mold restoration company. Classify restoration losses: water (flooding, leaks), fire/smoke, mold, sewage (Cat-3), commercial, inspection.",
  optionalIntakeFields: [
    {
      key: "activeLoss",
      label: "Damage is still spreading / active right now",
      placeholder: "",
      type: "checkbox",
      askPrompt: "Is water still leaking right now?",
      askOnCall: true,
    },
    {
      key: "severity",
      label: "Damage severity",
      placeholder: "",
      type: "choice",
      choices: ["Minor", "Moderate", "Severe"],
      askPrompt: "How bad is the damage right now?",
      askOnCall: true,
    },
    { key: "insuranceCarrier", label: "Insurance company", placeholder: "State Farm, Allstate…", type: "text" },
    { key: "insuranceClaimNumber", label: "Claim number", placeholder: "If already filed", type: "text" },
    { key: "waterSource", label: "Water source", placeholder: "Burst pipe, appliance, roof…", type: "text" },
  ],
  dispatchPolicy: {
    holdPatterns: /fire|smoke|sewage|cat-?3|commercial|multi-?unit/i,
    autoP1Patterns: /water|flood|leak/i,
  },
};

const HVAC_CONFIG: VerticalConfig = {
  label: "HVAC",
  shortLabel: "HVAC",
  icon: "❄️",
  tagline: "No-heat calls dispatched the moment they're verified.",
  defaultAvgJobTicketUsd: 1200,
  issueExamples: [
    "No heat — furnace not working",
    "No AC — system not cooling",
    "Gas smell near unit",
    "Strange noise from HVAC",
    "Maintenance or tune-up",
  ],
  emergencyDetectionContext:
    "US HVAC company. Classify: no_heat (furnace/heat pump not working — P1 in heating season), no_cool (AC not cooling — P1 in summer), gas_smell (gas leak near unit — always urgent, always hold), sparking/electrical_concern (hold), maintenance (routine tune-up, filter, non-urgent — P3).",
  optionalIntakeFields: [
    {
      key: "urgency",
      label: "How soon service is needed",
      placeholder: "",
      type: "choice",
      choices: ["Today", "This week", "Flexible"],
      askPrompt: "How soon do you need someone out?",
      askOnCall: true,
    },
    {
      key: "lastServiceYear",
      label: "Last service year",
      placeholder: "e.g. 2023, or first-time customer",
      type: "text",
      askPrompt:
        "Roughly when was your system last serviced? A year is fine, or just let me know if this is your first time with us.",
      askOnCall: true,
    },
    { key: "noHeat", label: "No heat — system won't heat", placeholder: "", type: "checkbox" },
    { key: "noCool", label: "No cooling — AC won't cool", placeholder: "", type: "checkbox" },
  ],
  dispatchPolicy: {
    holdPatterns: /gas\s*(smell|leak|odor)|sparking|spark|electrical\s*fire|carbon\s*monoxide/i,
    autoP1Patterns: /no[\s-]heat|no[\s-]cool|won'?t\s*heat|won'?t\s*cool|furnace\s*(out|fail|down|not)|ac\s*(out|fail|down|not)/i,
  },
};

const PLUMBING_CONFIG: VerticalConfig = {
  label: "Plumbing",
  shortLabel: "Plumbing",
  icon: "🔧",
  tagline: "Every leak answered, every crew dispatched fast.",
  defaultAvgJobTicketUsd: 400,
  issueExamples: [
    "Burst pipe / active leak",
    "No hot water",
    "Drain clog",
    "Toilet overflowing",
    "Faucet repair",
  ],
  emergencyDetectionContext:
    "US plumbing company. Classify: active_leak (burst pipe, water actively flowing — P1), sewage (sewage backup, overflowing toilet — hold), no_hot_water (P2), clog (non-urgent drain clog — P2/P3), repair (faucet/fixture — P2/P3).",
  optionalIntakeFields: [
    { key: "activeWater", label: "Water is actively flowing / flooding", placeholder: "", type: "checkbox" },
  ],
  dispatchPolicy: {
    holdPatterns: /sewage|septic|contaminate/i,
    autoP1Patterns: /burst|active\s*leak|flooding|water\s*main/i,
  },
};

const ELECTRICAL_CONFIG: VerticalConfig = {
  label: "Electrical",
  shortLabel: "Electrical",
  icon: "⚡",
  tagline: "Safety-first dispatch for every electrical call.",
  defaultAvgJobTicketUsd: 350,
  issueExamples: [
    "No power / outage",
    "Sparking outlet or panel",
    "Tripped breaker",
    "New outlet or panel install",
    "Inspection",
  ],
  emergencyDetectionContext:
    "US electrical contractor. Classify: sparking (sparks, smoke, burning smell — always urgent, always hold), outage (no power to home/unit — P1), breaker (tripped breaker — P2), install (outlets, panel, wiring — P2/P3), inspection (P3).",
  optionalIntakeFields: [],
  dispatchPolicy: {
    holdPatterns: /spark|burning\s*smell|electrical\s*fire|smoke\s*(from|near)\s*(outlet|panel|wire)/i,
    autoP1Patterns: /no\s*power|total\s*outage|power\s*out/i,
  },
};

const PEST_CONFIG: VerticalConfig = {
  label: "Pest Control",
  shortLabel: "Pest",
  icon: "🐛",
  tagline: "Every pest call handled, every crew dispatched.",
  defaultAvgJobTicketUsd: 300,
  issueExamples: [
    "Bed bugs",
    "Termites / structural damage",
    "Roaches",
    "Rodents / mice",
    "Preventive treatment",
  ],
  emergencyDetectionContext:
    "US pest control company. Classify: bed_bugs (active infestation — P1/P2 urgent), termites/structural (P1/P2), rodents/roaches (P2), preventive (routine treatment — P3).",
  optionalIntakeFields: [],
  dispatchPolicy: {
    holdPatterns: /(?!.*)/i, // pest: no safety hold categories
    autoP1Patterns: /bed\s*bug|termite|structural\s*damage/i,
  },
};

const GENERAL_CONFIG: VerticalConfig = {
  label: "General Home Services",
  shortLabel: "General",
  icon: "🏠",
  tagline: "Every service call answered and dispatched.",
  defaultAvgJobTicketUsd: 350,
  issueExamples: [
    "Emergency repair needed",
    "Water or flooding issue",
    "No heat or AC",
    "Electrical concern",
    "General maintenance",
  ],
  emergencyDetectionContext:
    "US home service company. Classify calls: P1 (active damage, safety risk, spreading problem), P2 (service needed soon), P3 (routine maintenance, scheduling).",
  optionalIntakeFields: [],
  dispatchPolicy: {
    holdPatterns: /gas\s*(smell|leak)|spark|electrical\s*fire/i,
    autoP1Patterns: /flood|water\s*(active|burst)|no\s*heat|no\s*power/i,
  },
};

export const VERTICAL_CONFIGS: Record<ShopVertical, VerticalConfig> = {
  restoration: RESTORATION_CONFIG,
  hvac: HVAC_CONFIG,
  plumbing: PLUMBING_CONFIG,
  electrical: ELECTRICAL_CONFIG,
  pest: PEST_CONFIG,
  general: GENERAL_CONFIG,
};

export function getVerticalConfig(vertical: ShopVertical): VerticalConfig {
  return VERTICAL_CONFIGS[vertical] ?? VERTICAL_CONFIGS.restoration;
}
