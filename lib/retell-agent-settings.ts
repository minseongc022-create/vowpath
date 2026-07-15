/**
 * Retell agent voice + interaction tuning — keep in sync with scripts/lib/retell-agent-settings.mjs
 */

/** Bump when prompt/tone/voice changes — surfaced on /api/retell/status for sync verification. */
export const RETELL_PROMPT_VERSION = "natural-female-v11-jenny-native-2026-07-15";

/** Marker checked on /api/retell/status to verify live Retell LLM prompt synced. */
export const RETELL_PROMPT_SYNC_MARKER = "ENGLISH ONLY (critical)";

/** Override in Vercel: RETELL_VOICE_ID=11labs-Rachel */
export const RETELL_FALLBACK_FEMALE_VOICE_ID = "11labs-Rachel";

/** Natural, warm American female — professional dispatcher tone. */
export const RETELL_PREFERRED_VOICE_NAMES = [
  "Rachel",
  "Sarah",
  "Aria",
  "Charlotte",
  "Laura",
  "Jessica",
  "Matilda",
  "Nicole",
] as const;

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

function isFemale(v: RetellVoiceInfo): boolean {
  return (v.gender || "").toLowerCase() === "female";
}

/** Pick a warm US English female dispatcher — never returns a male voice. */
export function pickNaturalReceptionistVoice(
  voices: RetellVoiceInfo[],
  options?: { explicitId?: string; currentVoiceId?: string },
): string {
  const explicit = options?.explicitId?.trim();
  if (explicit) return explicit;

  const americanFemales = (voices ?? []).filter((v) => isUsEnglishVoice(v) && isFemale(v));

  for (const preferred of RETELL_PREFERRED_VOICE_NAMES) {
    const hit = americanFemales.find((v) =>
      (v.voice_name || "").toLowerCase().includes(preferred.toLowerCase()),
    );
    if (hit) return hit.voice_id;
  }

  if (americanFemales[0]?.voice_id) return americanFemales[0].voice_id;

  const current = options?.currentVoiceId;
  const currentVoice = (voices ?? []).find((v) => v.voice_id === current);
  if (current && currentVoice && isFemale(currentVoice) && isUsEnglishVoice(currentVoice)) {
    return current;
  }

  return RETELL_FALLBACK_FEMALE_VOICE_ID;
}

/** Shared PATCH body — warm US dispatcher: human, steady, noise-resistant. */
export function buildRetellProductionAgentPatch(voiceId?: string) {
  const patch: Record<string, unknown> = {
    agent_name: "Effiroad Intake Agent",
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
    ],
    denoising_mode: "noise-and-background-speech-cancellation",
    voice_temperature: 0.72,
    voice_speed: 1.0,
    voice_model: "eleven_turbo_v2_5",
    enable_dynamic_voice_speed: false,
    volume: 1.22,
    responsiveness: 0.84,
    enable_dynamic_responsiveness: false,
    interruption_sensitivity: 0.08,
    enable_backchannel: false,
    reminder_trigger_ms: 12000,
    reminder_max_count: 1,
  };

  if (voiceId) patch.voice_id = voiceId;
  return patch;
}
