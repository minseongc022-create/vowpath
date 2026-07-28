/**
 * Demo TTS tuning — keep aligned with live Retell telephony (lib/retell-agent-settings.ts).
 * Retell booking agent uses voice_speed 0.98, deep US male (Marcus/Clyde/Steve).
 */

/** Matches Retell `voice_speed` — clear American pacing on phone. */
export const DEMO_VOICE_SPEED = 0.98;

/** OpenAI TTS — closest built-in to Retell deep US male when ElevenLabs unavailable. */
export const DEMO_OPENAI_VOICE = "onyx" as const;

/** Edge fallback — Guy Neural for phone-like clarity. */
export const DEMO_EDGE_VOICE = "en-US-GuyNeural";
export const DEMO_EDGE_RATE = "-2%";
export const DEMO_EDGE_PITCH = "+0Hz";

/** ElevenLabs voice id closest to Retell Marcus (deep US male). */
export const DEMO_ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam — deep, widely available
