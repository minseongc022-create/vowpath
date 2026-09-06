"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PLACEMENT_TEST } from "@/topik/lib/quiz/placement-test";
import type { PlacementGap, PlacementSectionScore } from "@/topik/lib/quiz/placement-scoring";
import { placementSectionLabel } from "@/topik/lib/quiz/placement-scoring";
import { useTopikVi, useIsKoLocale } from "@/topik/lib/i18n/TopikLocaleProvider";
import { IconCheckCircle } from "@/topik/components/ui/TopikIcons";
import { quizQuestionText } from "@/topik/lib/i18n/content-locale";
import { useTopikFocus } from "@/topik/components/focus/TopikFocusProvider";
import { ListeningAudioPlayer } from "@/topik/components/listening/ListeningAudioPlayer";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";

type Phase = "intro" | "test" | "result";

type PlacementApiResult = {
  placementLevel: number;
  targetLevel: number;
  correct: number;
  total: number;
  accuracy: number;
  sectionScores: PlacementSectionScore[];
  gaps: PlacementGap[];
  recommendations: { titleVi: string; titleKo: string; href: string }[];
};

export function PlacementTestClient() {
  const vi = useTopikVi();
  const ko = useIsKoLocale();

  const [phase, setPhase] = useState<Phase>("intro");
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ questionId: string; selectedIndex: number }[]>([]);
  const [result, setResult] = useState<PlacementApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { enterFocus, leaveFocus, setFocusProgress } = useTopikFocus();

  useEffect(() => {
    if (phase === "test") {
      enterFocus({ title: vi.placement.title, exitHref: "/topik/placement" });
    } else {
      leaveFocus();
    }
  }, [phase, enterFocus, leaveFocus, vi.placement.title]);

  useEffect(() => {
    if (phase === "test") {
      setFocusProgress(`${idx + 1}/${PLACEMENT_TEST.length}`);
    }
  }, [phase, idx, setFocusProgress]);

  const q = PLACEMENT_TEST[idx];

  async function handleNext() {
    if (!q || selected === null) return;
    const nextAnswers = [...answers, { questionId: q.id, selectedIndex: selected }];

    if (idx + 1 >= PLACEMENT_TEST.length) {
      setLoading(true);
      const res = await fetch("/topik/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: nextAnswers }),
      });
      const data = (await res.json()) as PlacementApiResult;
      setAnswers(nextAnswers);
      setResult(data);
      setPhase("result");
      setLoading(false);
      return;
    }

    setAnswers(nextAnswers);
    setIdx((i) => i + 1);
    setSelected(null);
  }

  if (phase === "intro") {
    return (
      <div className="topik-quiz-shell topik-animate-in">
        <div className="topik-card topik-card-pad">
          <p className="topik-page-subtitle">{vi.placement.subtitle}</p>
          <ul className="topik-setup-list">
            <li>{vi.placement.intro1}</li>
            <li>{vi.placement.intro2}</li>
            <li>{vi.placement.intro3}</li>
            <li>{vi.placement.intro4}</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setPhase("test")}
          className="topik-btn topik-btn-accent topik-btn-lg"
        >
          {vi.placement.start}
        </button>
      </div>
    );
  }

  if (phase === "result" && result) {
    const pct = Math.round(result.accuracy * 100);
    return (
      <div className="topik-quiz-shell topik-animate-in">
        <div className="topik-card topik-card-pad text-center">
          <IconCheckCircle className="mx-auto text-learn-primary" size={52} />
          <p className="topik-result-label">{vi.placement.result}</p>
          <p className="topik-result-score">TOPIK {result.placementLevel}</p>
          <p className="topik-result-hint">
            {result.correct}/{result.total} ({pct}%) — {vi.placement.resultHint}
          </p>
        </div>

        {result.sectionScores.length > 0 && (
          <div className="topik-card topik-card-pad">
            <p className="topik-section-title">{vi.placement.sectionBreakdown}</p>
            <ul className="topik-setup-list">
              {result.sectionScores.map((s) => {
                const label = placementSectionLabel(s.section, ko);
                const acc = Math.round(s.accuracy * 100);
                return (
                  <li key={s.section}>
                    {label}: {s.correct}/{s.total} ({acc}%)
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {result.gaps.length > 0 ? (
          <div className="topik-card topik-card-pad">
            <p className="topik-section-title">{vi.placement.gapsTitle}</p>
            <ul className="topik-setup-list">
              {result.gaps.map((gap) => (
                <li key={gap.section}>
                  <strong>{ko ? gap.labelKo : gap.labelVi}</strong> —{" "}
                  {ko ? gap.reasonKo : gap.reasonVi}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="topik-card topik-card-pad">
            <p className="text-sm text-learn-ink-muted">{vi.placement.noGaps}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {result.recommendations.map((rec) => (
            <Link
              key={rec.href}
              href={rec.href}
              className="topik-btn topik-btn-accent topik-btn-lg"
            >
              {ko ? rec.titleKo : rec.titleVi}
            </Link>
          ))}
          <Link href="/topik" className="topik-btn topik-btn-outline topik-btn-lg">
            {vi.placement.backHome}
          </Link>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="topik-quiz-shell topik-quiz-shell--focus topik-animate-in">
      <div className="topik-card topik-card-pad">
        {q.listeningScript && (
          <div className="topik-listening-block mb-3">
            <ListeningAudioPlayer script={q.listeningScript} autoPlay maxPlays={2} />
          </div>
        )}
        {q.passage && (
          <p className="topik-passage font-ko">
            <KoreanStudyText text={q.passage} studyMode={false} />
          </p>
        )}
        <p className="topik-question-vi">{quizQuestionText(q)}</p>
      </div>

      <div className="topik-option-list">
        {q.options?.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => setSelected(i)}
            className={`topik-option ${selected === i ? "topik-option-selected" : ""}`}
          >
            {opt}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void handleNext()}
        disabled={selected === null || loading}
        className="topik-btn topik-btn-primary topik-btn-lg"
      >
        {idx + 1 >= PLACEMENT_TEST.length ? vi.placement.finish : vi.placement.next}
      </button>
    </div>
  );
}
