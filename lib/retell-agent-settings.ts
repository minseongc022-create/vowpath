/**
 * Retell agent voice + interaction tuning — keep in sync with scripts/lib/retell-agent-settings.mjs
 */

/** Bump when prompt/tone/voice changes — surfaced on /api/retell/status for sync verification. */
export const RETELL_PROMPT_VERSION = "cinematic-voice-v20-2026-07-23";

/** Marker checked on /api/retell/status to verify live Retell LLM prompt synced. */
export const RETELL_PROMPT_SYNC_MARKER = "ENGLISH ONLY (critical)";

/** Clear cinematic US male — prefer Brian for phone clarity (override: RETELL_VOICE_ID). */
export const RETELL_FALLBACK_MALE_VOICE_ID = "11labs-Brian";

/** Service / emergency — crisp, cinematic US male (Brian first for phone clarity). */
export const RETELL_BOOKING_PREFERRED_VOICE_NAMES = [
  "Brian",
  "George",
  "Mark",
  "Daniel",
  "Marcus",
  "Steve",
] as const;

/** Free estimate — same crisp cinematic male set. */
export const RETELL_ESTIMATE_PREFERRED_VOICE_NAMES = [
  "Brian",
  "George",
  "Mark",
  "Daniel",
  "Marcus",
] as const;

/** @deprecated use RETELL_BOOKING_PREFERRED_VOICE_NAMES */
export const RETELL_PREFERRED_VOICE_NAMES = RETELL_BOOKING_PREFERRED_VOICE_NAMES;

export type RetellVoiceInfo = {
  voice_id: string;
  voice_name?: string;
  provider?: string;
  accent?: string;
  gender?: string;
};

function isUsEnglishVoice(v: RetellVoiceInfo): boolean {
  const id = (v.voice_id || "").toLowerCase();
  const name = (v.voice_name || "").toLowerCase();
  const accent = (v.accent || "").toLowerCase();
  if (v.provider !== "elevenlabs") return false;
  if (!accent.includes("american")) return false;
  if (id.includes("spanish") || id.includes("localized") || name.includes("spanish")) return false;
  return true;
}

function isMale(v: RetellVoiceInfo): boolean {
  return (v.gender || "").toLowerCase() === "male";
}

function pickFromList(
  voices: RetellVoiceInfo[],
  preferredNames: readonly string[],
  options?: { explicitId?: string; currentVoiceId?: string },
): string {
  const explicit = options?.explicitId?.trim();
  if (explicit) return explicit;

  const americanMales = (voices ?? []).filter((v) => isUsEnglishVoice(v) && isMale(v));

  for (const preferred of preferredNames) {
    const hit = americanMales.find((v) =>
      (v.voice_name || "").toLowerCase().includes(preferred.toLowerCase()),
    );
    if (hit) return hit.voice_id;
  }

  if (americanMales[0]?.voice_id) return americanMales[0].voice_id;

  const current = options?.currentVoiceId;
  const currentVoice = (voices ?? []).find((v) => v.voice_id === current);
  if (current && currentVoice && isMale(currentVoice) && isUsEnglishVoice(currentVoice)) {
    return current;
  }

  return RETELL_FALLBACK_MALE_VOICE_ID;
}

/** Pick a warm, calm US English male voice for service / emergency intake. */
export function pickNaturalReceptionistVoice(
  voices: RetellVoiceInfo[],
  options?: { explicitId?: string; currentVoiceId?: string },
): string {
  return pickFromList(voices, RETELL_BOOKING_PREFERRED_VOICE_NAMES, options);
}

/** Pick a warm US English male voice for estimate intake. */
export function pickEstimateReceptionistVoice(
  voices: RetellVoiceInfo[],
  options?: {
    explicitId?: string;
    explicitEstimateId?: string;
    currentVoiceId?: string;
  },
): string {
  return pickFromList(voices, RETELL_ESTIMATE_PREFERRED_VOICE_NAMES, {
    explicitId: options?.explicitEstimateId ?? options?.explicitId,
    currentVoiceId: options?.currentVoiceId,
  });
}

function sharedAgentPatch(): Record<string, unknown> {
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
    // noise-cancellation: clears HVAC/traffic without distorting soft speech.
    // background-speech cancel was cutting off "yes"/addresses and lowering STT accuracy.
    denoising_mode: "noise-cancellation",
    // multilingual_v2 = richer / clearer on telephony than turbo (less thin/"underwater").
    voice_model: "eleven_multilingual_v2",
    enable_dynamic_voice_speed: false,
    enable_dynamic_responsiveness: false,
    // Allow callers to barge in and correct names/addresses (0.03 was too locked).
    interruption_sensitivity: 0.28,
    enable_backchannel: false,
    reminder_trigger_ms: 14000,
    reminder_max_count: 1,
  };
}

/** Crisp cinematic service / emergency intake — lower temp + volume for phone clarity. */
export function buildRetellBookingAgentPatch(voiceId?: string) {
  const patch: Record<string, unknown> = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Booking Agent",
    // High temperature sounded muddy/warbling on SIP; keep stable and clear.
    voice_temperature: 0.52,
    voice_speed: 0.92,
    // 1.28 clipped on narrowband → "underwater"; keep near unity.
    volume: 1.02,
    responsiveness: 0.7,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** Estimate intake — same cinematic clarity. */
export function buildRetellEstimateAgentPatch(voiceId?: string) {
  const patch: Record<string, unknown> = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Estimate Agent",
    voice_temperature: 0.55,
    voice_speed: 0.93,
    volume: 1.02,
    responsiveness: 0.72,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** @deprecated use buildRetellBookingAgentPatch */
export function buildRetellProductionAgentPatch(voiceId?: string) {
  return buildRetellBookingAgentPatch(voiceId);
}
