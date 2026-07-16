import type { ForwardingProviderId } from "./forwarding-guides-en";

export type ForwardingSetupPathId =
  | "dedicated_line"
  | "cell_overflow"
  | "business_voip"
  | "google_voice"
  | "quiz";

export type ForwardingPathConfidence = "highest" | "high" | "medium";

export type ForwardingSetupPath = {
  id: ForwardingSetupPathId;
  provider: ForwardingProviderId | null;
  confidence: ForwardingPathConfidence;
  successLabel: string;
  timeLabel: string;
  requiresCarrierPick?: boolean;
  requiresVoipPick?: boolean;
};

/** Overflow / forwarding paths — try these first */
export const FORWARDING_OVERFLOW_PATHS: ForwardingSetupPath[] = [
  {
    id: "cell_overflow",
    provider: null,
    confidence: "high",
    successLabel: "~85% on postpaid",
    timeLabel: "~5 min",
    requiresCarrierPick: true,
  },
  {
    id: "business_voip",
    provider: null,
    confidence: "high",
    successLabel: "~80% with admin",
    timeLabel: "~15 min",
    requiresVoipPick: true,
  },
  {
    id: "google_voice",
    provider: "google_voice",
    confidence: "medium",
    successLabel: "Forward-all only",
    timeLabel: "~20 min",
  },
];

/** @deprecated Use FORWARDING_OVERFLOW_PATHS — dedicated line is shown separately as fallback */
export const FORWARDING_SETUP_PATHS = FORWARDING_OVERFLOW_PATHS;

export const CELL_CARRIER_OPTIONS: { id: ForwardingProviderId; label: string; hint: string }[] = [
  { id: "att", label: "AT&T / Cricket", hint: "One-tap **61* code" },
  { id: "tmobile", label: "T-Mobile / Metro / Mint", hint: "One-tap **61* code" },
  { id: "verizon", label: "Verizon", hint: "One-tap *71 code" },
  { id: "xfinity", label: "Xfinity Mobile", hint: "One-tap *71 code" },
];

export const VOIP_SYSTEM_OPTIONS: { id: ForwardingProviderId; label: string; hint: string }[] = [
  { id: "dialpad", label: "Dialpad / Jobber Phone / ServiceTitan", hint: "Fallback → external" },
  { id: "ringcentral", label: "RingCentral", hint: "Sequential ring → external" },
  { id: "grasshopper", label: "Grasshopper", hint: "Extension forwarding" },
];

/** Backup paths when primary overflow fails — always includes dedicated line */
export function getAlternateForwardingPaths(
  current: ForwardingProviderId,
): ForwardingProviderId[] {
  const order: ForwardingProviderId[] = [
    "verizon",
    "att",
    "tmobile",
    "xfinity",
    "dialpad",
    "ringcentral",
    "grasshopper",
    "google_voice",
    "effiroad_main",
  ];
  return order.filter((p) => p !== current);
}

export function pathForProvider(provider: ForwardingProviderId): ForwardingSetupPathId {
  if (provider === "effiroad_main") return "dedicated_line";
  if (provider === "google_voice") return "google_voice";
  if (CELL_CARRIER_OPTIONS.some((c) => c.id === provider)) return "cell_overflow";
  return "business_voip";
}
