/**
 * Retell agent voice + interaction tuning — keep in sync with lib/retell-agent-settings.ts
 */

export const RETELL_PROMPT_VERSION = "deep-male-v7-warm-human-2026-07-15";

export const RETELL_PROMPT_SYNC_MARKER = "ENGLISH ONLY (critical)";

export const RETELL_FALLBACK_MALE_VOICE_ID = "11labs-Steve";

export const RETELL_PREFERRED_VOICE_NAMES = [
  "Steve",
  "Mark",
  "George",
  "Dylan",
  "Eric",
  "Anthony",
  "Adrian",
];

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

export function pickNaturalReceptionistVoice(voices, options = {}) {
  const explicit = options.explicitId?.trim();
  if (explicit) return explicit;

  const americanMales = (voices ?? []).filter((v) => isUsEnglishVoice(v) && isMale(v));

  for (const preferred of RETELL_PREFERRED_VOICE_NAMES) {
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

export function buildRetellProductionAgentPatch(voiceId) {
  const patch = {
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
    voice_temperature: 0.78,
    voice_speed: 0.96,
    voice_model: "eleven_turbo_v2_5",
    enable_dynamic_voice_speed: false,
    volume: 1.28,
    responsiveness: 0.92,
    enable_dynamic_responsiveness: false,
    interruption_sensitivity: 0.2,
    enable_backchannel: false,
    reminder_trigger_ms: 12000,
    reminder_max_count: 1,
  };

  if (voiceId) patch.voice_id = voiceId;
  return patch;
}
