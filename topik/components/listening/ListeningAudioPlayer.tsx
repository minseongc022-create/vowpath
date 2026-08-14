"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { preloadKoreanVoices, speakKorean, stopKoreanSpeech } from "@/topik/lib/korean/tts";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { IconSpeaker } from "@/topik/components/ui/TopikIcons";

type Props = {
  script: string;
  autoPlay?: boolean;
  maxPlays?: number;
  className?: string;
};

export function cleanListeningScript(script: string): string {
  return script
    .replace(/[「」]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ListeningAudioPlayer({

  script,
  autoPlay = true,
  maxPlays = 2,
  className = "",
}: Props) {
  const vi = useTopikVi();
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const lastScript = useRef("");

  const text = cleanListeningScript(script);
  const remaining = Math.max(0, maxPlays - playCount);
  const canPlay = remaining > 0 && !playing;

  const playOnce = useCallback(async () => {
    if (!text || playCount >= maxPlays) return;
    setPlaying(true);
    setPlayCount((c) => c + 1);
    await speakKorean(text, 0.82);
    setPlaying(false);
  }, [text, playCount, maxPlays]);

  useEffect(() => {
    preloadKoreanVoices();
    return () => stopKoreanSpeech();
  }, []);

  useEffect(() => {
    if (!autoPlay || !text) return;
    if (lastScript.current === text) return;
    lastScript.current = text;
    setPlayCount(0);
    setPlaying(true);

    void (async () => {
      preloadKoreanVoices();
      setPlayCount(1);
      await speakKorean(text, 0.82);
      setPlaying(false);
    })();
  }, [text, autoPlay]);

  if (!text) return null;

  return (
    <div className={`topik-listening-audio ${className}`}>
      <div className="topik-listening-audio-visual" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`topik-listening-wave ${playing ? "topik-listening-wave-active" : ""}`}
          />
        ))}
      </div>
      <p className="topik-listening-audio-label">
        {playing ? vi.listening.playing : vi.listening.playHintShort}
      </p>
      <button
        type="button"
        onClick={() => void playOnce()}
        disabled={!canPlay}
        className="topik-btn topik-btn-primary topik-btn-lg topik-listening-play-btn"
      >
        <IconSpeaker size={20} />
        {playing ? vi.listening.playing : remaining > 0 ? vi.listening.replay : vi.listening.noMorePlays}
      </button>
      {maxPlays > 1 && (
        <p className="topik-listening-plays-left">
          {vi.listening.playsLeft}: {remaining}/{maxPlays}
        </p>
      )}
    </div>
  );
}
