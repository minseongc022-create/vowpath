"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lookupWord, tokenizeKoreanText, getDisplayMeaning, type DictEntry } from "@/topik/lib/korean/dictionary";
import { speakKorean, stopKoreanSpeech, preloadKoreanVoices } from "@/topik/lib/korean/tts";
import { vi } from "@/topik/lib/i18n/vi";
import { IconSpeaker } from "@/topik/components/ui/TopikIcons";

type Props = {
  text: string;
  /** false during mock exam / placement test — no tap hints or TTS */
  studyMode?: boolean;
  className?: string;
};

export function KoreanStudyText({ text, studyMode = true, className = "" }: Props) {
  const [popup, setPopup] = useState<{ entry: DictEntry | null; word: string; x: number; y: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (studyMode) preloadKoreanVoices();
    return () => stopKoreanSpeech();
  }, [studyMode]);

  const handleWordClick = useCallback(
    async (word: string, e: React.MouseEvent) => {
      if (!studyMode) return;
      e.stopPropagation();
      const cleaned = word.replace(/[「」]/g, "");
      const entry = lookupWord(cleaned);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setPopup({
        entry,
        word: cleaned,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
      await speakKorean(cleaned);
    },
    [studyMode],
  );

  if (!studyMode) {
    return <span className={`font-ko ${className}`}>{text}</span>;
  }

  const tokens = tokenizeKoreanText(text);

  return (
    <>
      <span ref={containerRef} className={`topik-korean-text ${className}`}>
        {tokens.map((tok, i) =>
          tok.isKorean ? (
            <button
              key={`${i}-${tok.text}`}
              type="button"
              className="topik-korean-word"
              onClick={(e) => void handleWordClick(tok.text, e)}
              title={vi.korean.tapHint}
            >
              {tok.text}
            </button>
          ) : (
            <span key={`${i}-${tok.text}`}>{tok.text}</span>
          ),
        )}
      </span>

      {popup && (
        <WordPopup
          word={popup.word}
          entry={popup.entry}
          x={popup.x}
          y={popup.y}
          onClose={() => {
            setPopup(null);
            stopKoreanSpeech();
          }}
        />
      )}
    </>
  );
}

function WordPopup({
  word,
  entry,
  x,
  y,
  onClose,
}: {
  word: string;
  entry: DictEntry | null;
  x: number;
  y: number;
  onClose: () => void;
}) {
  return (
    <>
      <button type="button" className="topik-word-popup-backdrop" onClick={onClose} aria-label={vi.common.back} />
      <div
        className="topik-word-popup"
        style={{
          left: Math.min(Math.max(x, 120), typeof window !== "undefined" ? window.innerWidth - 120 : x),
          top: Math.max(y - 8, 60),
          transform: "translate(-50%, -100%)",
        }}
        role="dialog"
      >
        <p className="topik-word-popup-ko font-ko">{word}</p>
        {entry?.romanization && (
          <p className="topik-word-popup-roman">{entry.romanization}</p>
        )}
        <p className="topik-word-popup-vi">
          {getDisplayMeaning(entry, vi.korean.noDefinition)}
        </p>
        {entry?.example && (
          <p className="topik-word-popup-example font-ko">{entry.example}</p>
        )}
        <button
          type="button"
          className="topik-word-popup-speak"
          onClick={() => void speakKorean(word)}
        >
          <IconSpeaker size={18} />
          {vi.korean.listenAgain}
        </button>
      </div>
    </>
  );
}
