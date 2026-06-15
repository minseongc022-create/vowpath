import { isEnglishUi } from "./locale";

import * as en from "./forwarding-guides-en";

import * as ko from "./forwarding-guides-ko";



const guides = isEnglishUi() ? en : ko;



export type ForwardingScenarioId = en.ForwardingScenarioId;

export type LegacyForwardingScenarioId = en.LegacyForwardingScenarioId;

export type ForwardingProviderId = en.ForwardingProviderId;

export type ForwardingScenario = en.ForwardingScenario;

export type ForwardingProvider = en.ForwardingProvider;



export const normalizeForwardingScenario = guides.normalizeForwardingScenario;

export const FORWARDING_PROVIDER_NOTE = guides.FORWARDING_PROVIDER_NOTE;

export const FORWARDING_SCENARIOS = guides.FORWARDING_SCENARIOS;

export const FORWARDING_PROVIDERS = guides.FORWARDING_PROVIDERS;

export const getForwardingGuideSteps = guides.getForwardingGuideSteps;

