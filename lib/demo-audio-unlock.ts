/** Unlock browser audio after a user gesture (autoplay policy). */
import { demoAudioPlayer } from "./demo-audio-player";

export function isDemoAudioUnlocked(): boolean {
  return demoAudioPlayer.isUnlocked();
}

/** Call synchronously inside click/tap handlers before async audio playback. */
export function unlockDemoAudio(): boolean {
  return demoAudioPlayer.unlock();
}
