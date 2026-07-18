import * as en from "./forwarding-guides-en";
import * as enUnblock from "./forwarding-unblock-guides-en";
import * as ko from "./forwarding-guides-ko";
import * as koUnblock from "./forwarding-unblock-guides-ko";
import { runtimeUiLocale, type UiLocale } from "./locale";

export type ForwardingScenarioId = en.ForwardingScenarioId;
export type LegacyForwardingScenarioId = en.LegacyForwardingScenarioId;
export type ForwardingProviderId = en.ForwardingProviderId;
export type ForwardingProvider = en.ForwardingProvider;

function pack(locale?: UiLocale) {
  const loc = locale ?? runtimeUiLocale();
  return loc === "ko"
    ? { guides: ko, unblock: koUnblock }
    : { guides: en, unblock: enUnblock };
}

export const normalizeForwardingScenario = en.normalizeForwardingScenario;
export const normalizeForwardingProvider = en.normalizeForwardingProvider;
export const isDirectEffiroadLineProvider = en.isDirectEffiroadLineProvider;

export function getForwardingGuideSteps(
  provider: ForwardingProviderId,
  scenario: LegacyForwardingScenarioId,
  effiroadNumber: string,
  locale?: UiLocale,
): string[] {
  return pack(locale).guides.getForwardingGuideSteps(provider, scenario, effiroadNumber);
}

export function getForwardingUnblockGuides(
  provider: ForwardingProviderId,
  tenDigitEffiroad: string,
  locale?: UiLocale,
) {
  return pack(locale).unblock.getForwardingUnblockGuides(provider, tenDigitEffiroad);
}

export function forwardingOverflowSummary(locale?: UiLocale): string {
  return pack(locale).guides.FORWARDING_OVERFLOW_SUMMARY;
}

export function forwardingTroubleshooting(
  provider: ForwardingProviderId,
  locale?: UiLocale,
): string[] {
  return pack(locale).guides.FORWARDING_TROUBLESHOOTING[provider];
}

export function forwardingTroubleshootingSwitchNote(
  provider: ForwardingProviderId,
  locale?: UiLocale,
): string {
  return pack(locale).guides.FORWARDING_TROUBLESHOOTING_SWITCH_NOTE[provider];
}

export function forwardingTroubleshootingFallback(locale?: UiLocale): string {
  return pack(locale).guides.FORWARDING_TROUBLESHOOTING_FALLBACK;
}

/** @deprecated Use forwardingOverflowSummary(locale) */
export const FORWARDING_OVERFLOW_SUMMARY = en.FORWARDING_OVERFLOW_SUMMARY;
export const FORWARDING_EFFIROAD_MAIN_SUMMARY = en.FORWARDING_EFFIROAD_MAIN_SUMMARY;
export const FORWARDING_EFFIROAD_MAIN_FEATURES = en.FORWARDING_EFFIROAD_MAIN_FEATURES;
export const FORWARDING_AFTER_HOURS_NOTE = en.FORWARDING_AFTER_HOURS_NOTE;
export const FORWARDING_IPHONE_WARNING = en.FORWARDING_IPHONE_WARNING;
export const FORWARDING_PROVIDER_NOTE = en.FORWARDING_PROVIDER_NOTE;
export const FORWARDING_SCENARIOS = en.FORWARDING_SCENARIOS;
export const FORWARDING_PROVIDERS = en.FORWARDING_PROVIDERS;
export const FORWARDING_TROUBLESHOOTING = en.FORWARDING_TROUBLESHOOTING;
export const FORWARDING_TROUBLESHOOTING_SWITCH_NOTE = en.FORWARDING_TROUBLESHOOTING_SWITCH_NOTE;
export const FORWARDING_TROUBLESHOOTING_FALLBACK = en.FORWARDING_TROUBLESHOOTING_FALLBACK;

export type { ForwardingUnblockGuide } from "./forwarding-unblock-guides-en";
export { FORWARDING_CARRIER_PHONES } from "./forwarding-unblock-guides-en";
