/**
 * Retell agent voice + interaction tuning — keep in sync with scripts/lib/retell-agent-settings.mjs
 */

/** Bump when prompt/tone/voice changes — surfaced on /api/retell/status for sync verification. */
export const RETELL_PROMPT_VERSION = "clear-fast-voice-v36-2026-07-28";

/** Marker checked on /api/retell/status to verify live Retell LLM prompt synced. */
export const RETELL_PROMPT_SYNC_MARKER = "ENGLISH ONLY (critical)";

/** Deep trustworthy US male — Steve is available on Retell (Mark/Adam often missing). */
export const RETELL_FALLBACK_MALE_VOICE_ID = "11labs-Steve";

/** Prefer these Retell voice IDs first (deep / grounded), then name matching. */
export const RETELL_DEEP_MALE_VOICE_IDS = [
  "11labs-Marcus",
  "11labs-Clyde",
  "11labs-Daniel",
  "11labs-Mark",
  "11labs-Adam",
  "11labs-Steve",
] as const;

/**
 * Thin / bright voices that sound “mosquito-like” on phone — never keep these
 * even if RETELL_VOICE_ID or the live agent is set to them.
 */
const THIN_VOICE_RE = /brian|chris|josh|liam|harry|ethan|billy/i;

export function isThinRetellVoiceId(voiceId: string | null | undefined): boolean {
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
] as const;

/** Free estimate — same deep trustworthy set. */
export const RETELL_ESTIMATE_PREFERRED_VOICE_NAMES = [
  "Marcus",
  "Clyde",
  "Daniel",
  "Mark",
  "Adam",
  "Steve",
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
  const explicitRaw = options?.explicitId?.trim();
  const explicit =
    explicitRaw && !isThinRetellVoiceId(explicitRaw) ? explicitRaw : undefined;
  if (explicit) return explicit;

  const all = voices ?? [];

  // Prefer known deep voice IDs even when accent metadata is incomplete.
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
      // Word match only — "Bill" must not select "Billy".
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

  const current = options?.currentVoiceId;
  if (current && !isThinRetellVoiceId(current)) {
    const currentVoice = (voices ?? []).find((v) => v.voice_id === current);
    if (currentVoice && isMale(currentVoice) && isUsEnglishVoice(currentVoice)) {
      return current;
    }
  }

  return RETELL_FALLBACK_MALE_VOICE_ID;
}

/** Pick a deep, trustworthy US English male voice for service / emergency intake. */
export function pickNaturalReceptionistVoice(
  voices: RetellVoiceInfo[],
  options?: { explicitId?: string; currentVoiceId?: string },
): string {
  return pickFromList(voices, RETELL_BOOKING_PREFERRED_VOICE_NAMES, options);
}

/** Pick a deep US English male voice for estimate intake. */
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
    // Accurate STT for addresses/names; pair with high responsiveness for ~1.5s turns.
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
      "air conditioner",
      "heat pump",
      "water heater",
      "leaking",
      "ceiling",
      "drywall",
      "terrace",
      "parkway",
      "north",
      "south",
      "east",
      "west",
    ],
    // Clears HVAC/traffic without crushing soft speech.
    denoising_mode: "noise-cancellation",
    // Turbo = clearer on phone + lower TTS latency than multilingual_v2.
    voice_model: "eleven_turbo_v2_5",
    enable_dynamic_voice_speed: true,
    enable_dynamic_responsiveness: true,
    // Higher = end-of-utterance sooner so answers start faster.
    interruption_sensitivity: 0.5,
    enable_backchannel: false,
    reminder_trigger_ms: 8000,
    reminder_max_count: 1,
  };
}

/** Clear / snappy service intake — volume kept below telephony clip. */
export function buildRetellBookingAgentPatch(voiceId?: string) {
  const patch: Record<string, unknown> = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Booking Agent",
    voice_temperature: 0.45,
    voice_speed: 1.1,
    volume: 1.05,
    responsiveness: 1.0,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** Estimate intake — same clarity, slightly warmer. */
export function buildRetellEstimateAgentPatch(voiceId?: string) {
  const patch: Record<string, unknown> = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Estimate Agent",
    voice_temperature: 0.48,
    voice_speed: 1.1,
    volume: 1.05,
    responsiveness: 1.0,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** @deprecated use buildRetellBookingAgentPatch */
export function buildRetellProductionAgentPatch(voiceId?: string) {
  return buildRetellBookingAgentPatch(voiceId);
}
