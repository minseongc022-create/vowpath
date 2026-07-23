/**
 * Twilio main-menu / scripted prompts (not Retell).
 * Charon: deep, steady US male — trustworthy receptionist tone.
 * Override with TWILIO_SAY_VOICE_EN_US if needed.
 */
export const TWILIO_SAY_VOICE_EN_US_DEFAULT = "Google.en-US-Chirp3-HD-Charon";

export function twilioSayVoiceEnUs(): string {
  const fromEnv = process.env.TWILIO_SAY_VOICE_EN_US?.trim();
  if (fromEnv) return fromEnv;
  return TWILIO_SAY_VOICE_EN_US_DEFAULT;
}
