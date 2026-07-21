/**
 * Retell agent voice + interaction tuning — keep in sync with lib/retell-agent-settings.ts
 */

export const RETELL_PROMPT_VERSION = "upbeat-dual-voice-v15-2026-07-21";

export const RETELL_PROMPT_SYNC_MARKER = "ENGLISH ONLY (critical)";

export const RETELL_FALLBACK_MALE_VOICE_ID = "11labs-Steve";

/** Service / emergency booking — energetic, confident US male. */
export const RETELL_BOOKING_PREFERRED_VOICE_NAMES = [
  "Brian",
  "Daniel",
  "Mark",
  "Steve",
  "Chris",
  "Eric",
];

/** Free estimate — warmer, brighter, friendlier US male. */
export const RETELL_ESTIMATE_PREFERRED_VOICE_NAMES = [
  "Chris",
  "Eric",
  "Brian",
  "Daniel",
  "George",
];

/** @deprecated use RETELL_BOOKING_PREFERRED_VOICE_NAMES */
export const RETELL_PREFERRED_VOICE_NAMES = RETELL_BOOKING_PREFERRED_VOICE_NAMES;

function isUsEnglishVoice(v) {
  const id = (v.voice_id || "").toLowerCase();
  const name = (v.voice_name || "").toLowerCase();
  const accent = (v.accent || "").toLowerCase();
  if (v.provider !== "elevenlabs") return false;
  if (!accent.includes("american")) return false;
  if (id.includes("spanish") || id.includes("localized") || name.includes("spanish")) return false;
  return true;
}

function isMale(v) {
  return (v.gender || "").toLowerCase() === "male";
}

function pickFromList(voices, preferredNames, options = {}) {
  const explicit = options.explicitId?.trim();
  if (explicit) return explicit;

  const americanMales = (voices ?? []).filter((v) => isUsEnglishVoice(v) && isMale(v));

  for (const preferred of preferredNames) {
    const hit = americanMales.find((v) =>
      (v.voice_name || "").toLowerCase().includes(preferred.toLowerCase()),
    );
    if (hit) return hit.voice_id;
  }

  if (americanMales[0]?.voice_id) return americanMales[0].voice_id;

  const current = options.currentVoiceId;
  const currentVoice = (voices ?? []).find((v) => v.voice_id === current);
  if (current && currentVoice && isMale(currentVoice) && isUsEnglishVoice(currentVoice)) {
    return current;
  }

  return RETELL_FALLBACK_MALE_VOICE_ID;
}

export function pickNaturalReceptionistVoice(voices, options = {}) {
  return pickFromList(voices, RETELL_BOOKING_PREFERRED_VOICE_NAMES, options);
}

export function pickEstimateReceptionistVoice(voices, options = {}) {
  return pickFromList(voices, RETELL_ESTIMATE_PREFERRED_VOICE_NAMES, {
    explicitId: options.explicitEstimateId ?? options.explicitId,
    currentVoiceId: options.currentVoiceId,
  });
}

function sharedAgentPatch() {
  return {
    language: "en-US",
    stt_mode: "accurate",
    vocab_specialization: "general",
    boosted_keywords: [
      "water damage",
      "water leak",
      "fire damage",
      "mold",
      "sewage",
      "basement",
      "burst pipe",
      "flood",
      "estimate",
      "emergency",
      "HVAC",
      "no heat",
      "no cool",
      "restoration",
      "mitigation",
      "text link",
      "SMS",
    ],
    denoising_mode: "noise-and-background-speech-cancellation",
    voice_model: "eleven_turbo_v2_5",
    enable_dynamic_voice_speed: false,
    enable_dynamic_responsiveness: false,
    interruption_sensitivity: 0.04,
    enable_backchannel: false,
    reminder_trigger_ms: 12000,
    reminder_max_count: 1,
  };
}

/** Upbeat service / emergency intake agent. */
export function buildRetellBookingAgentPatch(voiceId) {
  const patch = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Booking Agent",
    voice_temperature: 0.93,
    voice_speed: 1.02,
    volume: 1.14,
    responsiveness: 0.78,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** Warmer, brighter free-estimate agent. */
export function buildRetellEstimateAgentPatch(voiceId) {
  const patch = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Estimate Agent",
    voice_temperature: 0.98,
    voice_speed: 1.06,
    volume: 1.18,
    responsiveness: 0.82,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** @deprecated use buildRetellBookingAgentPatch */
export function buildRetellProductionAgentPatch(voiceId) {
  return buildRetellBookingAgentPatch(voiceId);
}
