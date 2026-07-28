import { DEMO_PLAYBACK_VOLUME } from "@/lib/demo-voice-settings";

/** Shared HTMLAudioElement — iOS allows chained plays after one user gesture. */
class DemoAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private ringAudio: HTMLAudioElement | null = null;
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

  /** Resume Web Audio after autoplay policy or iOS suspend. */
  async ensureReady(): Promise<boolean> {
    if (!this.unlocked || typeof window === "undefined") return false;
    const ctx = this.ensureAudioCtx();
    if (!ctx) return false;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    return ctx.state === "running";
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
          this.audio.volume = DEMO_PLAYBACK_VOLUME;
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
    audio.volume = DEMO_PLAYBACK_VOLUME;
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
   * US-style ring cadence (440+480 Hz) — plays when IVR hands off to AI receptionist.
   * Uses pre-rendered MP3 first (reliable on mobile), Web Audio as backup.
   */
  async playTransferTone(totalMs = 1600): Promise<void> {
    if (!this.unlocked || typeof window === "undefined") {
      await new Promise((r) => setTimeout(r, totalMs));
      return;
    }

    const mp3Played = await this.playTransferToneMp3(totalMs);
    if (mp3Played) return;

    await this.ensureReady();
    const ctx = this.ensureAudioCtx();
    if (!ctx || ctx.state !== "running") {
      await new Promise((r) => setTimeout(r, totalMs));
      return;
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
        gain.gain.exponentialRampToValueAtTime(0.16, t + 0.04);
        gain.gain.setValueAtTime(0.16, t + onDur - 0.06);
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

  private async playTransferToneMp3(totalMs: number): Promise<boolean> {
    if (!this.ringAudio) {
      this.ringAudio = new Audio("/demo-audio/transfer-ring.mp3");
      this.ringAudio.preload = "auto";
    }
    const ring = this.ringAudio;
    ring.volume = 0.75;
    ring.currentTime = 0;

    try {
      await ring.play();
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        ring.onended = done;
        ring.onerror = done;
        setTimeout(done, totalMs);
      });
      ring.pause();
      ring.currentTime = 0;
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
    utterance.rate = 0.98;
    utterance.volume = DEMO_PLAYBACK_VOLUME;
    const voices = window.speechSynthesis.getVoices();
    const male =
      voices.find((v) => v.lang.startsWith("en") && /male|guy|daniel|david|mark|james|aaron|fred|charon|onyx/i.test(v.name)) ??
      voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google US English"));
    if (male) utterance.voice = male;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
