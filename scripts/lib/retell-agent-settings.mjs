/**
 * Retell agent voice + interaction tuning — keep in sync with lib/retell-agent-settings.ts
 */

export const RETELL_PROMPT_VERSION = "accurate-stt-v19-2026-07-22";

export const RETELL_PROMPT_SYNC_MARKER = "ENGLISH ONLY (critical)";

export const RETELL_FALLBACK_MALE_VOICE_ID = "11labs-Daniel";

/** Service / emergency — calm confident receptionist, slightly warm-low tone. */
export const RETELL_BOOKING_PREFERRED_VOICE_NAMES = [
  "Daniel",
  "Mark",
  "George",
  "Marcus",
  "Brian",
  "Steve",
];

/** Free estimate — same trust tone; gently warm (not hyper-bright). */
export const RETELL_ESTIMATE_PREFERRED_VOICE_NAMES = [
  "Daniel",
  "Brian",
  "Mark",
  "George",
  "Marcus",
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
      "smoke damage",
      "mold",
      "black mold",
      "sewage",
      "sewage backup",
      "basement",
      "crawl space",
      "burst pipe",
      "slab leak",
      "flood",
      "flooding",
      "estimate",
      "emergency",
      "HVAC",
      "AC",
      "furnace",
      "thermostat",
      "no heat",
      "no cool",
      "not cooling",
      "gas smell",
      "restoration",
      "mitigation",
      "text link",
      "SMS",
      "insurance",
      "callback",
      "street",
      "avenue",
      "boulevard",
      "drive",
      "lane",
      "court",
      "circle",
      "road",
      "apartment",
      "unit",
      "suite",
    ],
    denoising_mode: "noise-cancellation",
    voice_model: "eleven_turbo_v2_5",
    enable_dynamic_voice_speed: false,
    enable_dynamic_responsiveness: false,
    interruption_sensitivity: 0.32,
    enable_backchannel: false,
    reminder_trigger_ms: 14000,
    reminder_max_count: 1,
  };
}

/** Calm, confident service / emergency intake — comfortable pace, warm-low tone. */
export function buildRetellBookingAgentPatch(voiceId) {
  const patch = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Booking Agent",
    voice_temperature: 0.92,
    voice_speed: 0.95,
    volume: 1.28,
    responsiveness: 0.72,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** Estimate intake — same trust tone, gently warm. */
export function buildRetellEstimateAgentPatch(voiceId) {
  const patch = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Estimate Agent",
    voice_temperature: 0.94,
    voice_speed: 0.96,
    volume: 1.28,
    responsiveness: 0.74,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** @deprecated use buildRetellBookingAgentPatch */
export function buildRetellProductionAgentPatch(voiceId) {
  return buildRetellBookingAgentPatch(voiceId);
}
