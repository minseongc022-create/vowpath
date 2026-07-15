/**
 * Retell agent voice + interaction tuning — keep in sync with lib/retell-agent-settings.ts
 */

export const RETELL_PROMPT_VERSION = "warm-male-v6-english-strict-2026-07-15";

export const RETELL_PROMPT_SYNC_MARKER = "ENGLISH ONLY (critical)";

/** Warm American male dispatcher — override in Vercel: RETELL_VOICE_ID=11labs-Adrian */
export const RETELL_PREFERRED_VOICE_NAMES = [
  "Adrian",
  "Mark",
  "Steve",
  "Dylan",
  "Anthony",
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

export function pickNaturalReceptionistVoice(voices, options = {}) {
  const explicit = options.explicitId?.trim();
  if (explicit) return explicit;

  const american = (voices ?? []).filter(isUsEnglishVoice);

  for (const preferred of RETELL_PREFERRED_VOICE_NAMES) {
    const hit = american.find((v) =>
      (v.voice_name || "").toLowerCase().includes(preferred.toLowerCase()),
    );
    if (hit) return hit.voice_id;
  }

  const male = american.find((v) => (v.gender || "").toLowerCase() === "male");
  if (male) return male.voice_id;

  const current = options.currentVoiceId;
  if (current && american.some((v) => v.voice_id === current)) return current;

  return american[0]?.voice_id;
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
    voice_temperature: 0.95,
    voice_speed: 1.02,
    voice_model: "eleven_turbo_v2_5",
    enable_dynamic_voice_speed: false,
    volume: 1.3,
    responsiveness: 0.95,
    enable_dynamic_responsiveness: false,
    interruption_sensitivity: 0.2,
    enable_backchannel: false,
    reminder_trigger_ms: 12000,
    reminder_max_count: 1,
  };

  if (voiceId) patch.voice_id = voiceId;
  return patch;
}
