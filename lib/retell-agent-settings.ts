/**
 * Retell agent voice + interaction tuning — keep in sync with scripts/lib/retell-agent-settings.mjs
 */

/** Bump when prompt/tone/voice changes — surfaced on /api/retell/status for sync verification. */
export const RETELL_PROMPT_VERSION = "masculine-voice-v22-2026-07-23";

/** Marker checked on /api/retell/status to verify live Retell LLM prompt synced. */
export const RETELL_PROMPT_SYNC_MARKER = "ENGLISH ONLY (critical)";

/** Deep trustworthy US male — Mark (override: RETELL_VOICE_ID, non-thin only). */
export const RETELL_FALLBACK_MALE_VOICE_ID = "11labs-Mark";

/**
 * Thin / bright voices that sound “mosquito-like” on phone — never keep these
 * even if RETELL_VOICE_ID or the live agent is set to them.
 */
const THIN_VOICE_RE = /brian|chris|josh|liam|harry|ethan|billy/i;

export function isThinRetellVoiceId(voiceId: string | null | undefined): boolean {
  return Boolean(voiceId && THIN_VOICE_RE.test(voiceId));
}

/** Service / emergency — deep, grounded US male (Mark / Bill / Adam first). */
export const RETELL_BOOKING_PREFERRED_VOICE_NAMES = [
  "Mark",
  "Bill",
  "Adam",
  "Clyde",
  "Marcus",
  "Steve",
  "Daniel",
  "George",
] as const;

/** Free estimate — same deep trustworthy set. */
export const RETELL_ESTIMATE_PREFERRED_VOICE_NAMES = [
  "Mark",
  "Bill",
  "Adam",
  "Clyde",
  "Marcus",
  "Steve",
  "Daniel",
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

  const americanMales = (voices ?? []).filter(
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
    denoising_mode: "noise-cancellation",
    // multilingual_v2 = fuller body on telephony than turbo.
    voice_model: "eleven_multilingual_v2",
    enable_dynamic_voice_speed: false,
    enable_dynamic_responsiveness: false,
    interruption_sensitivity: 0.28,
    enable_backchannel: false,
    reminder_trigger_ms: 14000,
    reminder_max_count: 1,
  };
}

/** Deep masculine service / emergency intake — weight + calm pace. */
export function buildRetellBookingAgentPatch(voiceId?: string) {
  const patch: Record<string, unknown> = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Booking Agent",
    // Slight warmth without warble; slower = more grounded / less thin.
    voice_temperature: 0.62,
    voice_speed: 0.88,
    volume: 1.1,
    responsiveness: 0.68,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** Estimate intake — same deep masculine presence. */
export function buildRetellEstimateAgentPatch(voiceId?: string) {
  const patch: Record<string, unknown> = {
    ...sharedAgentPatch(),
    agent_name: "Effiroad Estimate Agent",
    voice_temperature: 0.64,
    voice_speed: 0.89,
    volume: 1.1,
    responsiveness: 0.7,
  };
  if (voiceId) patch.voice_id = voiceId;
  return patch;
}

/** @deprecated use buildRetellBookingAgentPatch */
export function buildRetellProductionAgentPatch(voiceId?: string) {
  return buildRetellBookingAgentPatch(voiceId);
}
