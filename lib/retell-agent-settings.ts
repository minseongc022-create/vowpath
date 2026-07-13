/**
 * Retell agent voice + interaction tuning — keep in sync with scripts/lib/retell-agent-settings.mjs
 */

/** Bump when prompt/tone changes — surfaced on /api/retell/status for sync verification. */
export const RETELL_PROMPT_VERSION = "warm-v3-2026-07-13";

/** Override in Vercel: RETELL_VOICE_ID=11labs-Grace */
export const RETELL_PREFERRED_VOICE_NAMES = [
  "Grace",
  "Sloane",
  "Hailey",
  "Paola",
  "Adrian",
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

/** Pick a warm, upbeat US English receptionist voice for the intake agent. */
export function pickNaturalReceptionistVoice(
  voices: RetellVoiceInfo[],
  options?: { explicitId?: string; currentVoiceId?: string },
): string | undefined {
  const explicit = options?.explicitId?.trim();
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

  const current = options?.currentVoiceId;
  if (current && american.some((v) => v.voice_id === current)) return current;

  return american[0]?.voice_id;
}

/** Shared PATCH body — warm American phone tone, natural pace and pitch for US listeners. */
export function buildRetellProductionAgentPatch(voiceId?: string) {
  const patch: Record<string, unknown> = {
    agent_name: "Effiroad Intake Agent",
    language: "en-US",
    stt_mode: "accurate",
    vocab_specialization: "general",
    boosted_keywords: [
      "water damage",
      "fire damage",
      "mold",
      "sewage backup",
      "basement",
      "burst pipe",
      "estimate",
      "emergency",
      "HVAC",
      "no heat",
    ],
    // ~1.0 = standard American conversational pace; dynamic adjusts to caller
    voice_temperature: 1.05,
    voice_speed: 1.0,
    voice_model: "eleven_v3",
    enable_dynamic_voice_speed: true,
    // Engaged but not interrupting — feels attentive to US callers
    responsiveness: 0.8,
    enable_dynamic_responsiveness: true,
    interruption_sensitivity: 0.4,
    enable_backchannel: true,
    backchannel_frequency: 0.6,
    backchannel_words: ["yeah", "absolutely", "for sure", "okay", "got it", "right"],
    reminder_trigger_ms: 15000,
    reminder_max_count: 1,
  };

  if (voiceId) patch.voice_id = voiceId;
  return patch;
}
