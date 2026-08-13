/** Korean TTS via Web Speech API — study mode only */

let speaking = false;

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopKoreanSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  speaking = false;
}

export function speakKorean(text: string, rate = 0.85): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }

    stopKoreanSpeech();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = rate;
    utter.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const koVoice = voices.find((v) => v.lang.startsWith("ko"));
    if (koVoice) utter.voice = koVoice;

    utter.onend = () => {
      speaking = false;
      resolve();
    };
    utter.onerror = () => {
      speaking = false;
      resolve();
    };

    speaking = true;
    window.speechSynthesis.speak(utter);
  });
}

export function isSpeaking(): boolean {
  return speaking;
}

/** Preload voices (Chrome loads async) */
export function preloadKoreanVoices(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
