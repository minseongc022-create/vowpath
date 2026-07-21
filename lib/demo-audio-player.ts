/** Shared HTMLAudioElement — iOS allows chained plays after one user gesture. */
class DemoAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private unlocked = false;
  private playGeneration = 0;

  isUnlocked(): boolean {
    return this.unlocked;
  }

  /** Stop any in-flight MP3 immediately (prevents overlap). */
  stop(): void {
    this.playGeneration += 1;
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    if (!this.audio) return;
    this.audio.onended = null;
    this.audio.onerror = null;
    this.audio.pause();
    this.audio.currentTime = 0;
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
    const playPromise = this.audio.play();
    if (playPromise) {
      void playPromise
        .then(() => {
          if (!this.audio) return;
          this.audio.pause();
          this.audio.currentTime = 0;
          this.audio.volume = 1;
          this.unlocked = true;
        })
        .catch(() => {
          this.unlocked = true;
        });
    } else {
      this.unlocked = true;
    }
    return true;
  }

  async playMp3(relativePath: string): Promise<boolean> {
    if (!this.unlocked || typeof window === "undefined") return false;
    this.stop();

    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "auto";
    }

    const generation = this.playGeneration;
    const audio = this.audio;
    audio.volume = 1;
    audio.src = relativePath;

    try {
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          if (generation === this.playGeneration) resolve();
        };
        audio.onerror = () => {
          if (generation === this.playGeneration) resolve();
        };
      });
      return generation === this.playGeneration;
    } catch {
      return false;
    }
  }
}

export const demoAudioPlayer = new DemoAudioPlayer();

/** Timed silence when MP3 missing — never use browser TTS (avoids random female system voices). */
export function demoSpeechPause(text: string): Promise<void> {
  const ms = Math.max(text.length * 55, 1800);
  return new Promise((r) => setTimeout(r, ms));
}
