import * as enUnblock from "./forwarding-unblock-guides-en";
import * as en from "./forwarding-guides-en";

const guides = en;
const unblock = enUnblock;

export type ForwardingScenarioId = en.ForwardingScenarioId;
export type LegacyForwardingScenarioId = en.LegacyForwardingScenarioId;
export type ForwardingProviderId = en.ForwardingProviderId;
export type ForwardingProvider = en.ForwardingProvider;

export const normalizeForwardingScenario = guides.normalizeForwardingScenario;
export const normalizeForwardingProvider = guides.normalizeForwardingProvider;
export const FORWARDING_OVERFLOW_SUMMARY = guides.FORWARDING_OVERFLOW_SUMMARY;
export const FORWARDING_EFFIROAD_MAIN_SUMMARY = guides.FORWARDING_EFFIROAD_MAIN_SUMMARY;
export const FORWARDING_EFFIROAD_MAIN_FEATURES = guides.FORWARDING_EFFIROAD_MAIN_FEATURES;
export const isDirectEffiroadLineProvider = guides.isDirectEffiroadLineProvider;
export const FORWARDING_AFTER_HOURS_NOTE = guides.FORWARDING_AFTER_HOURS_NOTE;
export const FORWARDING_IPHONE_WARNING = guides.FORWARDING_IPHONE_WARNING;
export const FORWARDING_PROVIDER_NOTE = guides.FORWARDING_PROVIDER_NOTE;
export const FORWARDING_SCENARIOS = guides.FORWARDING_SCENARIOS;
export const FORWARDING_PROVIDERS = guides.FORWARDING_PROVIDERS;
export const getForwardingGuideSteps = guides.getForwardingGuideSteps;
export const FORWARDING_TROUBLESHOOTING = guides.FORWARDING_TROUBLESHOOTING;
export const FORWARDING_TROUBLESHOOTING_SWITCH_NOTE = guides.FORWARDING_TROUBLESHOOTING_SWITCH_NOTE;
export const FORWARDING_TROUBLESHOOTING_FALLBACK = guides.FORWARDING_TROUBLESHOOTING_FALLBACK;

export const getForwardingUnblockGuides = unblock.getForwardingUnblockGuides;
export const FORWARDING_CARRIER_PHONES = unblock.FORWARDING_CARRIER_PHONES;
export type { ForwardingUnblockGuide } from "./forwarding-unblock-guides-en";
