/**
 * Retell agent voice + interaction tuning — keep in sync with scripts/lib/retell-agent-settings.mjs
 */

/** Override in Vercel: RETELL_VOICE_ID=11labs-Hailey */
export const RETELL_PREFERRED_VOICE_NAMES = [
  "Hailey",
  "Grace",
  "Sloane",
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

/** Pick a warm US receptionist voice; falls back to current agent voice or first American elevenlabs voice. */
export function pickNaturalReceptionistVoice(
  voices: RetellVoiceInfo[],
  options?: { explicitId?: string; currentVoiceId?: string },
): string | undefined {
  const explicit = options?.explicitId?.trim();
  if (explicit) return explicit;

  const list = voices ?? [];
  const american = list.filter(
    (v) =>
      v.provider === "elevenlabs" &&
      (v.accent || "").toLowerCase().includes("american"),
  );

  for (const name of RETELL_PREFERRED_VOICE_NAMES) {
    const hit = american.find((v) =>
      (v.voice_name || "").toLowerCase().includes(name.toLowerCase()),
    );
    if (hit) return hit.voice_id;
  }

  const female = american.find((v) => (v.gender || "").toLowerCase() === "female");
  if (female) return female.voice_id;

  if (options?.currentVoiceId && list.some((v) => v.voice_id === options.currentVoiceId)) {
    return options.currentVoiceId;
  }

  return american[0]?.voice_id ?? list[0]?.voice_id;
}

/** Shared PATCH body for update-agent — human, patient front-desk feel. */
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
    voice_temperature: 1.12,
    voice_speed: 0.93,
    enable_dynamic_voice_speed: true,
    responsiveness: 0.72,
    enable_dynamic_responsiveness: true,
    interruption_sensitivity: 0.35,
    enable_backchannel: true,
    backchannel_frequency: 0.55,
    backchannel_words: ["mm-hmm", "yeah", "okay", "right", "gotcha"],
    reminder_trigger_ms: 16000,
    reminder_max_count: 1,
  };

  if (voiceId) patch.voice_id = voiceId;
  return patch;
}
