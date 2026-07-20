/** Unlock browser audio after a user gesture (autoplay policy). */
let unlocked = false;

export function isDemoAudioUnlocked(): boolean {
  return unlocked;
}

/** Call synchronously inside click/tap handlers before async audio playback. */
export function unlockDemoAudio(): boolean {
  if (unlocked) return true;
  if (typeof window === "undefined") return false;

  try {
    const audio = new Audio("/demo-audio/voice-ai-0.mp3");
    audio.volume = 0.001;
    const playPromise = audio.play();
    if (playPromise) {
      void playPromise
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          unlocked = true;
        })
        .catch(() => {});
    }
    unlocked = true;
    return true;
  } catch {
    return false;
  }
}
