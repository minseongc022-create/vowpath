/** Korean TTS via Web Speech API */

let speaking = false;
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopKoreanSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  speaking = false;
}

function loadVoices(timeoutMs = 2500): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.onvoiceschanged = finish;
    window.setTimeout(finish, timeoutMs);
    window.speechSynthesis.getVoices();
  });
}

export function preloadKoreanVoices(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  voicesReady = loadVoices();
}

export function speakKorean(text: string, rate = 0.85): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) {
      resolve();
      return;
    }

    void (async () => {
      stopKoreanSpeech();
      const voices = voicesReady ? await voicesReady : await loadVoices();
      voicesReady = Promise.resolve(voices);

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ko-KR";
      utter.rate = rate;
      utter.pitch = 1;

      const koVoice =
        voices.find((v) => v.lang === "ko-KR") ??
        voices.find((v) => v.lang.startsWith("ko"));
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
    })();
  });
}

export function isSpeaking(): boolean {
  return speaking;
}

