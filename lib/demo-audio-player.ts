/** Shared HTMLAudioElement — iOS allows chained plays after one user gesture. */
class DemoAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private unlocked = false;
  private audioCtx: AudioContext | null = null;

  isUnlocked(): boolean {
    return this.unlocked;
  }

  private ensureAudioCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!this.audioCtx) this.audioCtx = new AC();
    return this.audioCtx;
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
    this.unlocked = true;
    const ctx = this.ensureAudioCtx();
    if (ctx?.state === "suspended") void ctx.resume();

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

  /**
   * US-style ring cadence (440+480 Hz) — feels like the call is connecting
   * to the next receptionist before the next AI line.
   */
  async playTransferTone(totalMs = 1600): Promise<void> {
    if (!this.unlocked || typeof window === "undefined") {
      await new Promise((r) => setTimeout(r, totalMs));
      return;
    }

    const ctx = this.ensureAudioCtx();
    if (!ctx) {
      await new Promise((r) => setTimeout(r, totalMs));
      return;
    }
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* ignore */
      }
    }

    const now = ctx.currentTime;
    const ringOn = 0.85;
    const ringOff = 0.35;
    let t = now;
    const end = now + totalMs / 1000;

    while (t < end) {
      const onDur = Math.min(ringOn, end - t);
      if (onDur <= 0.05) break;
      for (const freq of [440, 480]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.09, t + 0.04);
        gain.gain.setValueAtTime(0.09, t + onDur - 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + onDur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + onDur + 0.02);
      }
      t += onDur + ringOff;
    }

    await new Promise((r) => setTimeout(r, totalMs));
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
