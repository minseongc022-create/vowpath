"use client";

import type { TopikQuizQuestion } from "@/topik/types";
import { getCorrectAnswerText } from "@/topik/lib/quiz/check-answer";
import { quizExplanationText } from "@/topik/lib/i18n/content-locale";
import { vi } from "@/topik/lib/i18n/vi";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";

type Props = {
  question: TopikQuizQuestion;
  correct: boolean;
  attempts?: number;
  listeningScript?: React.ReactNode;
};

export function QuizFeedbackPanel({ question, correct, attempts = 1, listeningScript }: Props) {
  const correctText = getCorrectAnswerText(question);

  return (
    <div className={`topik-feedback ${correct ? "topik-feedback-ok" : "topik-feedback-no"}`}>
      <p className="topik-feedback-title">
        {correct ? `✓ ${vi.practice.correct}` : `✗ ${vi.practice.wrong}`}
      </p>
      {!correct && attempts > 1 && (
        <p className="topik-feedback-attempts">
          {vi.quiz.attemptCount.replace("{n}", String(attempts))}
        </p>
      )}
      {!correct && correctText && (
        <div className="topik-feedback-answer">
          <p className="topik-feedback-answer-label">{vi.quiz.correctAnswer}</p>
          <p className="topik-feedback-answer-text">
            {question.type === "sentence_order" ? (
              <KoreanStudyText text={correctText} studyMode />
            ) : (
              correctText
            )}
          </p>
        </div>
      )}
      <p className="topik-feedback-text">{quizExplanationText(question)}</p>
      {listeningScript}
    </div>
  );
}
