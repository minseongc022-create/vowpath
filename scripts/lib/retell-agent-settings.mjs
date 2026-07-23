/**
 * Retell agent voice + interaction tuning — keep in sync with lib/retell-agent-settings.ts
 */

export const RETELL_PROMPT_VERSION = "thick-voice-one-tap-v26-2026-07-23";

export const RETELL_PROMPT_SYNC_MARKER = "ENGLISH ONLY (critical)";

export const RETELL_FALLBACK_MALE_VOICE_ID = "11labs-Steve";

export const RETELL_DEEP_MALE_VOICE_IDS = [
  "11labs-Marcus",
  "11labs-Clyde",
  "11labs-Daniel",
  "11labs-Mark",
  "11labs-Adam",
  "11labs-Steve",
];

const THIN_VOICE_RE = /brian|chris|josh|liam|harry|ethan|billy/i;

export function isThinRetellVoiceId(voiceId) {
  return Boolean(voiceId && THIN_VOICE_RE.test(voiceId));
}

/** Service / emergency — deep, grounded US male (heavier body first). */
export const RETELL_BOOKING_PREFERRED_VOICE_NAMES = [
  "Marcus",
  "Clyde",
  "Daniel",
  "Mark",
  "Adam",
  "Steve",
  "George",
];

export const RETELL_ESTIMATE_PREFERRED_VOICE_NAMES = [
  "Marcus",
  "Clyde",
  "Daniel",
  "Mark",
  "Adam",
  "Steve",
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
  const explicitRaw = options.explicitId?.trim();
  const explicit =
    explicitRaw && !isThinRetellVoiceId(explicitRaw) ? explicitRaw : undefined;
  if (explicit) return explicit;

  const all = voices ?? [];

  for (const id of RETELL_DEEP_MALE_VOICE_IDS) {
    const hit = all.find(
      (v) =>
        v.voice_id === id &&
        isMale(v) &&
        !isThinRetellVoiceId(v.voice_id) &&
        (v.provider === "elevenlabs" || !v.provider),
    );
    if (hit) return hit.voice_id;
  }

  const americanMales = all.filter(
    (v) => isUsEnglishVoice(v) && isMale(v) && !isThinRetellVoiceId(v.voice_id),
  );

  for (const preferred of preferredNames) {
    const pref = preferred.toLowerCase();
    const hit = americanMales.find((v) => {
      const name = (v.voice_name || "").toLowerCase().trim();
      return (
        name === pref ||
        name.startsWith(`${pref} `) ||
        name.endsWith(` ${pref}`) ||
        name.includes(` ${pref} `)
      );
    });
    if (hit) return hit.voice_id;
  }

  if (americanMales[0]?.voice_id) return americanMales[0].voice_id;

  const current = options.currentVoiceId;
  if (current && !isThinRetellVoiceId(current)) {
    const currentVoice = (voices ?? []).find((v) => v.voice_id === current);
    if (currentVoice && isMale(currentVoice) && isUsEnglishVoice(currentVoice)) {
      return current;
    }
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
    voice_model: "eleven_multilingual_v2",
    enable_dynamic_voice_speed: false,
    enable_dynamic_responsiveness: false,
    interruption_sensitivity: 0.28,
    enable_backchannel: false,
    reminder_trigger_ms: 14000,
    reminder_max_count: 1,
  };
}

/** Deep masculine service / emergency intake — thick body, US pace. */
export function buildRetellBookingAgentPatch(voiceId) {
  const patch = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Booking Agent",
    voice_temperature: 0.5,
    voice_speed: 0.94,
    volume: 1.28,
    responsiveness: 0.68,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** Estimate intake — same thick masculine presence. */
export function buildRetellEstimateAgentPatch(voiceId) {
  const patch = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Estimate Agent",
    voice_temperature: 0.52,
    voice_speed: 0.94,
    volume: 1.28,
    responsiveness: 0.7,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** @deprecated use buildRetellBookingAgentPatch */
export function buildRetellProductionAgentPatch(voiceId) {
  return buildRetellBookingAgentPatch(voiceId);
}
