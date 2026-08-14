"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TopikLevel, TopikQuizQuestion } from "@/topik/types";
import type { MockExamTier } from "@/topik/lib/mock-exam/tier-exams";
import { tierLabelVi } from "@/topik/lib/mock-exam/tier-exams";
import type { MockExamAnswer } from "@/topik/lib/mock-exam/ibt-exam";
import { getQuestionSection } from "@/topik/lib/mock-exam/ibt-exam";
import { postSessionComplete } from "@/topik/lib/quiz/session-complete";
import { checkQuizAnswer, type SessionStats } from "@/topik/lib/quiz/check-answer";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { StudyModeHint } from "@/topik/components/korean/StudyModeHint";
import { useTopikFocus } from "@/topik/components/focus/TopikFocusProvider";
import { ListeningAudioPlayer } from "@/topik/components/listening/ListeningAudioPlayer";
import { SentenceOrderInput } from "@/topik/components/quiz/SentenceOrderInput";
import { QuizProgressBar } from "@/topik/components/quiz/QuizProgressBar";
import { QuizFeedbackPanel } from "@/topik/components/quiz/QuizFeedbackPanel";
import { QuizResultSummary } from "@/topik/components/quiz/QuizResultSummary";

type Phase = "setup" | "exam" | "result";

type ExamResult = {
  correct: number;
  total: number;
  score: number;
  maxScore: number;
  durationSec: number;
};

const DURATION_SEC = 20 * 60;

const TIERS: { id: MockExamTier; label: string }[] = [
  { id: "topik-i", label: "TOPIK I" },
  { id: "topik-ii", label: "TOPIK II" },
  { id: "topik-ibt", label: "IBT" },
  { id: "eps-topik", label: "EPS" },
];

function parseTier(raw: string | null): MockExamTier {
  if (raw === "topik-i" || raw === "topik-ii" || raw === "topik-ibt" || raw === "eps-topik") {
    return raw;
  }
  return "topik-ibt";
}

export function MockExamClient() {
  const vi = useTopikVi();

  const searchParams = useSearchParams();
  const initialTier = parseTier(searchParams.get("tier"));

  const [phase, setPhase] = useState<Phase>("setup");
  const [tier, setTier] = useState<MockExamTier>(initialTier);
  const [level, setLevel] = useState<TopikLevel>(3);
  const [questions, setQuestions] = useState<TopikQuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, MockExamAnswer>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [order, setOrder] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [firstTryMisses, setFirstTryMisses] = useState(0);
  const [bySection, setBySection] = useState<SessionStats["bySection"]>({});
  const [timeLeft, setTimeLeft] = useState(DURATION_SEC);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { enterFocus, leaveFocus, setFocusProgress } = useTopikFocus();

  useEffect(() => {
    setTier(initialTier);
    if (initialTier === "topik-i") setLevel(2);
  }, [initialTier]);

  const finishExam = useCallback(
    async (finalAnswers: Record<string, MockExamAnswer>) => {
      if (!startedAt) return;
      setLoading(true);
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      try {
        const res = await fetch("/topik/api/mock-exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level,
            tier,
            answers: finalAnswers,
            questionIds: questions.map((x) => x.id),
            durationSec,
          }),
        });
        const data = (await res.json()) as ExamResult;
        void data;
        await postSessionComplete("complete-mock", bySection);
        setPhase("result");
      } finally {
        setLoading(false);
      }
    },
    [level, tier, questions, startedAt, bySection],
  );

  useEffect(() => {
    if (phase !== "exam" || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (phase === "exam" && timeLeft <= 0 && questions.length > 0) {
      void finishExam(answers);
    }
  }, [phase, timeLeft, finishExam, answers, questions.length]);

  useEffect(() => {
    if (phase === "exam") {
      enterFocus({
        title: vi.mockExam.title,
        subtitle: tierLabelVi(tier),
        exitHref: "/topik/mock-exam",
      });
    } else {
      leaveFocus();
    }
  }, [phase, enterFocus, leaveFocus, tier]);

  useEffect(() => {
    if (phase === "exam" && questions.length > 0) {
      setFocusProgress(`${idx + 1}/${questions.length}`);
    }
  }, [phase, idx, questions.length, setFocusProgress]);

  async function startExam() {
    setLoading(true);
    const res = await fetch(`/topik/api/mock-exam?level=${level}&tier=${tier}`);
    const data = (await res.json()) as TopikQuizQuestion[];
    setQuestions(data);
    setIdx(0);
    setAnswers({});
    setScore(0);
    setFirstTryCorrect(0);
    setFirstTryMisses(0);
    setBySection({});
    resetAnswer();
    setTimeLeft(DURATION_SEC);
    setStartedAt(Date.now());
    setPhase("exam");
    setLoading(false);
  }

  const q = questions[idx];

  function resetAnswer() {
    setSelected(null);
    setTextAnswer("");
    setOrder([]);
    setShowResult(false);
    setCorrect(null);
    setAttempts(0);
  }

  async function saveWrong() {
    if (!q) return;
    await fetch("/topik/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "wrong",
        questionId: q.id,
        question: q.question,
        questionVi: q.questionVi,
        options: q.options,
        correctIndex: q.correctIndex,
        correctAnswer: q.correctAnswer,
        selectedIndex: selected ?? undefined,
        textAnswer: textAnswer || undefined,
        explanationVi: q.explanationVi,
        level: q.level,
      }),
    });
  }

  function storeAnswer(): MockExamAnswer {
    if (!q) return "";
    if (q.type === "multiple_choice") return selected ?? 0;
    if (q.type === "sentence_order") return [...order];
    return textAnswer;
  }

  async function handleSubmit() {
    if (!q) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const isCorrect = checkQuizAnswer(q, { selectedIndex: selected, textAnswer, order });
    setCorrect(isCorrect);
    setShowResult(true);

    if (isCorrect) {
      setScore((s) => s + 1);
      if (nextAttempts === 1) setFirstTryCorrect((n) => n + 1);
      const section = getQuestionSection(q);
      setBySection((prev) => {
        const sec = prev[section] ?? { correct: 0, total: 0 };
        return { ...prev, [section]: { correct: sec.correct + 1, total: sec.total + 1 } };
      });
    } else if (nextAttempts === 1) {
      setFirstTryMisses((n) => n + 1);
      await saveWrong();
    }
  }

  function handleRetry() {
    resetAnswer();
  }

  function handleNext() {
    if (!q) return;
    const nextAnswers = { ...answers, [q.id]: storeAnswer() };
    setAnswers(nextAnswers);

    if (idx + 1 >= questions.length) {
      void finishExam(nextAnswers);
      return;
    }
    setIdx((i) => i + 1);
    resetAnswer();
  }

  const canSubmit = useMemo(() => {
    if (!q) return false;
    if (q.type === "multiple_choice") return selected !== null;
    if (q.type === "sentence_order") return order.length === (q.fragments?.length ?? 0);
    return !!textAnswer.trim();
  }, [q, selected, order, textAnswer]);

  if (phase === "setup") {
    return (
      <div className="topik-quiz-shell topik-animate-in">
        <div className="topik-card topik-card-pad">
          <p className="topik-page-subtitle">{vi.mockExam.subtitle}</p>
          <p className="topik-badge mt-2">{tierLabelVi(tier)}</p>
          <ul className="topik-setup-list">
            <li>{vi.drill.questionCount.replace("{n}", "10")} · {vi.mockExam.section}</li>
            <li>{tier === "topik-ibt" ? vi.drill.orderHint : vi.practice.subtitle}</li>
            <li>{vi.drill.estimatedMin.replace("{n}", "20")}</li>
          </ul>
        </div>

        <label className="topik-field-label">{vi.mockExam.examType}</label>
        <div className="topik-pill-row">
          {TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTier(t.id);
                if (t.id === "topik-i") setLevel(2);
              }}
              className={`topik-pill ${tier === t.id ? "topik-pill-active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tier !== "topik-i" && tier !== "eps-topik" && (
          <>
            <label className="topik-field-label">{vi.mockExam.level}</label>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value) as TopikLevel)}
              className="topik-select"
            >
              {[1, 2, 3, 4, 5, 6].map((l) => (
                <option key={l} value={l}>
                  TOPIK {l}
                </option>
              ))}
            </select>
          </>
        )}

        <button
          type="button"
          onClick={() => void startExam()}
          disabled={loading}
          className="topik-btn topik-btn-accent topik-btn-lg"
        >
          {loading ? vi.common.loading : vi.mockExam.start}
        </button>
        <StudyModeHint />
      </div>
    );
  }

  if (phase === "result") {
    const sessionStats: SessionStats = {
      total: questions.length,
      correct: score,
      wrong: firstTryMisses,
      firstTryCorrect,
      bySection,
    };
    return (
      <QuizResultSummary
        title={vi.mockExam.result}
        stats={sessionStats}
        level={level}
        onRetry={() => setPhase("setup")}
        homeHref="/topik/mock-exam"
      />
    );
  }

  if (!q) return null;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="topik-quiz-shell topik-quiz-shell--focus topik-animate-in">
      <QuizProgressBar current={idx + 1} total={questions.length} />
      <div className="topik-card topik-card-pad">
        <div className="topik-focus-meta">
          <span className={`topik-focus-timer ${timeLeft < 120 ? "topik-focus-timer-warn" : ""}`}>
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>
        <span className="topik-badge">
          {tierLabelVi(tier)} · TOPIK {q.level} · {idx + 1}/{questions.length}
        </span>
        {q.category === "listening" && q.listeningScript && !showResult && (
          <div className="topik-listening-block mt-3">
            <ListeningAudioPlayer script={q.listeningScript} autoPlay maxPlays={2} />
          </div>
        )}
        {q.passage && (
          <p className="topik-passage">
            <KoreanStudyText text={q.passage} studyMode={false} />
          </p>
        )}
        <p className="topik-question-ko">
          <KoreanStudyText text={q.question} studyMode={false} />
        </p>
      </div>

      {q.type === "sentence_order" && q.fragments && (
        <SentenceOrderInput
          key={q.id}
          fragments={q.fragments}
          correctOrder={q.correctOrder}
          value={order}
          onChange={setOrder}
          disabled={showResult}
          showResult={showResult}
        />
      )}

      {q.type === "multiple_choice" && q.options && (
        <div className="topik-option-list">
          {q.options.map((opt, i) => (
            <button
              key={opt}
              type="button"
              disabled={showResult}
              onClick={() => setSelected(i)}
              className={`topik-option ${
                showResult && i === q.correctIndex
                  ? "topik-option-correct"
                  : showResult && i === selected && i !== q.correctIndex
                    ? "topik-option-wrong"
                    : selected === i
                      ? "topik-option-selected"
                      : ""
              }`}
            >
              {i + 1}. {opt}
            </button>
          ))}
        </div>
      )}

      {q.type === "short_answer" && (
        <input
          type="text"
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          disabled={showResult}
          placeholder={vi.practice.answerPlaceholder}
          className="topik-input"
        />
      )}

      {showResult && (
        <QuizFeedbackPanel question={q} correct={!!correct} attempts={attempts} />
      )}

      {!showResult ? (
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || loading}
          className="topik-btn topik-btn-primary topik-btn-lg"
        >
          {vi.practice.submit}
        </button>
      ) : correct ? (
        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="topik-btn topik-btn-primary topik-btn-lg"
        >
          {idx + 1 >= questions.length ? vi.mockExam.finish : vi.mockExam.next}
        </button>
      ) : (
        <button type="button" onClick={handleRetry} className="topik-btn topik-btn-accent topik-btn-lg">
          {vi.practice.tryAgain}
        </button>
      )}
    </div>
  );
}
