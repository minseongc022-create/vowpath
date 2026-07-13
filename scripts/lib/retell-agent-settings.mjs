/**
 * Retell agent voice + interaction tuning — keep in sync with lib/retell-agent-settings.ts
 */

export const RETELL_PROMPT_VERSION = "trust-pro-v5-english-strict-2026-07-13";

export const RETELL_PROMPT_SYNC_MARKER = "ENGLISH ONLY (critical)";

/** Override in Vercel: RETELL_VOICE_ID=11labs-Sloane */
export const RETELL_PREFERRED_VOICE_NAMES = [
  "Grace",
  "Hailey",
  "Sloane",
  "Adrian",
  "Paola",
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

  const female = american.find((v) => (v.gender || "").toLowerCase() === "female");
  if (female) return female.voice_id;

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
    voice_temperature: 0.88,
    voice_speed: 1.1,
    voice_model: "eleven_turbo_v2_5",
    enable_dynamic_voice_speed: false,
    volume: 1.35,
    responsiveness: 1.0,
    enable_dynamic_responsiveness: false,
    interruption_sensitivity: 0.22,
    enable_backchannel: false,
    reminder_trigger_ms: 12000,
    reminder_max_count: 1,
  };

  if (voiceId) patch.voice_id = voiceId;
  return patch;
}
