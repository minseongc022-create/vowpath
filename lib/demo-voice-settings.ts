/**
 * Demo TTS tuning — keep aligned with live Retell telephony (lib/retell-agent-settings.ts).
 * Retell booking agent uses voice_speed 1.0, warmer temperature, deep US male.
 */

/** Matches Retell `voice_speed` — natural conversational pace. */
export const DEMO_VOICE_SPEED = 1.0;

/** Demo MP3 playback gain (Retell telephony volume is 1.2; browser speakers clip louder). */
export const DEMO_PLAYBACK_VOLUME = 0.88;

/** OpenAI TTS — closest built-in to Retell deep US male when ElevenLabs unavailable. */
export const DEMO_OPENAI_VOICE = "onyx" as const;

/** Edge fallback — Andrew is more conversational / human than Guy on short lines. */
export const DEMO_EDGE_VOICE = "en-US-AndrewNeural";
export const DEMO_EDGE_RATE = "+0%";
export const DEMO_EDGE_PITCH = "+2Hz";

/** ElevenLabs voice id closest to Retell Marcus (deep US male). */
export const DEMO_ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam — deep, widely available
