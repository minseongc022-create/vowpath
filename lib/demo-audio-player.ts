/** Shared HTMLAudioElement — iOS allows chained plays after one user gesture. */
class DemoAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private unlocked = false;

  isUnlocked(): boolean {
    return this.unlocked;
  }

  /** Call synchronously inside a click/tap handler. */
  unlock(): boolean {
    if (typeof window === "undefined") return false;
    if (this.unlocked) return true;

    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "auto";
    }

    this.audio.src = "/demo-audio/voice-ai-0.mp3";
    this.audio.volume = 0.001;
    // Mark unlocked synchronously so the same user-gesture chain can playMp3 immediately.
    this.unlocked = true;
    const playPromise = this.audio.play();
    if (playPromise) {
      void playPromise
        .then(() => {
          if (!this.audio) return;
          this.audio.pause();
          this.audio.currentTime = 0;
          this.audio.volume = 1;
        })
        .catch(() => {
          /* Keep unlocked — speech fallback may still work */
        });
    }
    return true;
  }

  async playMp3(relativePath: string): Promise<boolean> {
    if (!this.unlocked || typeof window === "undefined") return false;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "auto";
    }

    const audio = this.audio;
    audio.volume = 1;
    audio.src = relativePath;

    try {
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const demoAudioPlayer = new DemoAudioPlayer();

export function speakDemoFallback(text: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return new Promise((r) => setTimeout(r, Math.max(text.length * 55, 1800)));
  }

  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
