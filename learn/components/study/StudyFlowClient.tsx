"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaterialRecord } from "@/learn/types/material";
import type { QuizAnswer, QuizEvidence, QuizSet } from "@/learn/types/quiz";
import { gradeShortAnswer } from "@/learn/lib/quiz/evidence";
import { MindmapDashboard } from "@/learn/components/mindmap/MindmapDashboard";
import { KeySummaryPanel } from "@/learn/components/learn/KeySummaryPanel";
import { LearnTutorChat } from "@/learn/components/study/LearnTutorChat";
import { BacktrackButton } from "@/learn/components/study/EvidenceBacktrack";
import { Button } from "@/learn/components/ui/Button";
import Link from "next/link";

type Step = "processing" | "learn" | "quiz" | "result";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "준비 중",
  EXTRACTING: "자료 추출 중",
  CHUNKING: "내용 분석 중",
  TRANSCRIBING: "음성 변환 중",
  ANALYZING: "AI 요약 생성 중",
  READY: "완료",
  FAILED: "실패",
};

export function StudyFlowClient({
  initial,
  initialSeek,
}: {
  initial: MaterialRecord;
  initialSeek?: QuizEvidence | null;
}) {
  const [material, setMaterial] = useState(initial);
  const [step, setStep] = useState<Step>(initial.status === "READY" ? "learn" : "processing");
  const [tab, setTab] = useState<"mindmap" | "summary">("mindmap");
  const [quiz, setQuiz] = useState<QuizSet | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [seekTarget, setSeekTarget] = useState<QuizEvidence | null>(initialSeek ?? null);
  const [seekTick, setSeekTick] = useState(initialSeek ? 1 : 0);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    percent: number;
    wrongCount: number;
  } | null>(null);

  const poll = useCallback(async () => {
    const res = await fetch(`/learn/api/library/${material.id}`);
    if (res.ok) {
      const data = (await res.json()) as MaterialRecord;
      setMaterial(data);
      if (data.status === "READY") setStep("learn");
    }
  }, [material.id]);

  useEffect(() => {
    if (material.status === "READY") {
      void fetch("/learn/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "view",
          materialId: material.id,
          materialTitle: material.title,
        }),
      });
    }
  }, [material.id, material.title, material.status]);

  useEffect(() => {
    if (["READY", "FAILED"].includes(material.status)) return;
    const t = setInterval(() => void poll(), 2000);
    return () => clearInterval(t);
  }, [material.status, poll]);

  async function startQuiz(regenerate = false) {
    setQuizLoading(true);
    try {
      const url = regenerate
        ? `/learn/api/quiz/${material.id}?regenerate=1`
        : `/learn/api/quiz/${material.id}`;
      const res = await fetch(url);
      if (res.ok) {
        setQuiz(await res.json());
        setStep("quiz");
      }
    } finally {
      setQuizLoading(false);
    }
  }

  function handleBacktrack(evidence: QuizEvidence) {
    setSeekTarget(evidence);
    setSeekTick((t) => t + 1);
    setStep("learn");
    setTab("mindmap");
  }

  if (step === "processing") {
    const progress = material.progress;
    const pct = progress
      ? Math.round((progress.completedChunks / Math.max(progress.totalChunks, 1)) * 100)
      : undefined;

    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center learn-animate-in">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-learn-primary/10">
          <span className="text-3xl animate-pulse">🧠</span>
        </div>
        <h1 className="text-xl font-bold text-learn-ink">{material.title}</h1>
        <p className="mt-2 text-sm text-learn-ink-muted">
          {STATUS_LABEL[material.status] ?? "처리 중"}
        </p>
        {material.status !== "FAILED" && (
          <div className="mt-6 w-full max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-learn-muted">
              <div
                className="h-full rounded-full bg-learn-primary transition-all duration-500"
                style={{ width: `${pct ?? 30}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-learn-ink-subtle">잠시만 기다려 주세요 · 자동으로 넘어갑니다</p>
          </div>
        )}
      </div>
    );
  }

  if (step === "quiz" && quiz) {
    return (
      <QuizFlow
        quiz={quiz}
        onBack={() => setStep("learn")}
        onBacktrack={handleBacktrack}
        onComplete={(graded, score, total) => {
          const percent = Math.round((score / total) * 100);
          setResult({
            score,
            total,
            percent,
            wrongCount: total - score,
          });
          setStep("result");
          void fetch(`/learn/api/quiz/${material.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: graded }),
          });
        }}
      />
    );
  }

  if (step === "result" && result) {
    return (
      <div className="px-4 py-8 learn-animate-in">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 text-5xl">
            {result.percent >= 80 ? "🎉" : result.percent >= 60 ? "👍" : "📚"}
          </div>
          <h1 className="text-2xl font-bold text-learn-ink">
            {result.score} / {result.total} 정답
          </h1>
          <p className="mt-1 text-lg font-semibold text-learn-primary">{result.percent}%</p>
          <p className="mt-3 text-sm text-learn-ink-muted">
            {result.wrongCount > 0
              ? "틀린 문제는 오답노트에 저장됐어요 · 근거 위치로 바로 복습 가능"
              : "완벽해요! 오늘 학습 완료"}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {result.wrongCount > 0 && (
              <Link href="/learn/wrong-notes">
                <Button size="lg" className="w-full">오답노트 · 근거 역추적</Button>
              </Link>
            )}
            <Button size="lg" variant="secondary" className="w-full" onClick={() => void startQuiz(true)}>
              새 문제 더 풀기 (무제한)
            </Button>
            <Link href="/learn/calendar">
              <Button size="lg" variant="ghost" className="w-full">오늘 학습 기록</Button>
            </Link>
            <Button size="lg" variant="ghost" className="w-full" onClick={() => setStep("learn")}>
              다시 학습하기
            </Button>
          </div>
        </div>
        <LearnTutorChat materialId={material.id} materialTitle={material.title} />
      </div>
    );
  }

  return (
    <div className="learn-animate-in pb-24">
      <header className="sticky top-0 z-20 border-b border-learn-border bg-learn-surface/95 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/learn" className="text-sm font-medium text-learn-ink-muted">←</Link>
          <h1 className="flex-1 truncate text-center text-sm font-bold text-learn-ink">{material.title}</h1>
          <button
            type="button"
            onClick={() => void startQuiz()}
            disabled={quizLoading || !material.analysis}
            className="shrink-0 rounded-xl bg-learn-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {quizLoading ? "…" : "퀴즈"}
          </button>
        </div>
        <div className="mt-2 flex gap-1 rounded-xl bg-learn-muted p-1">
          {(["mindmap", "summary"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
                tab === t ? "bg-learn-surface text-learn-primary shadow-learn-sm" : "text-learn-ink-muted"
              }`}
            >
              {t === "mindmap" ? "마인드맵" : "요약"}
            </button>
          ))}
        </div>
      </header>

      {tab === "mindmap" ? (
        <div className="h-[calc(100dvh-8.5rem)]">
          <MindmapDashboard
            key={seekTick}
            material={material}
            compact
            seekTarget={seekTarget}
          />
        </div>
      ) : (
        <div className="px-4 py-4">
          {material.analysis ? (
            <KeySummaryPanel
              summary={material.analysis.summary}
              sections={material.analysis.sections}
              keywords={material.analysis.keywords}
            />
          ) : (
            <p className="text-sm text-learn-ink-muted text-center py-12">요약 생성 중…</p>
          )}
        </div>
      )}

      <div
        className="fixed bottom-0 inset-x-0 z-30 border-t border-learn-border bg-learn-surface/95 backdrop-blur-lg p-4"
        style={{ paddingBottom: "max(1rem, var(--learn-safe-bottom))" }}
      >
        <Button
          size="lg"
          className="w-full"
          onClick={() => void startQuiz()}
          disabled={quizLoading || !material.analysis}
        >
          {quizLoading ? "AI 문제 생성 중…" : "학습 완료 · AI 문제 풀기 →"}
        </Button>
      </div>

      <LearnTutorChat materialId={material.id} materialTitle={material.title} />
    </div>
  );
}

function QuizFlow({
  quiz,
  onBack,
  onBacktrack,
  onComplete,
}: {
  quiz: QuizSet;
  onBack: () => void;
  onBacktrack: (evidence: QuizEvidence) => void;
  onComplete: (graded: QuizAnswer[], score: number, total: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [mcAnswer, setMcAnswer] = useState<number | undefined>();
  const [textAnswer, setTextAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [allAnswers, setAllAnswers] = useState<QuizAnswer[]>([]);

  const q = quiz.questions[current]!;

  function checkAnswer() {
    let correct = false;
    if (q.type === "short_answer") {
      correct = gradeShortAnswer(textAnswer, q.correctAnswer ?? "");
    } else {
      correct = mcAnswer === q.correctIndex;
    }
    setIsCorrect(correct);
    setRevealed(true);
    const answer: QuizAnswer = {
      questionId: q.id,
      type: q.type,
      selectedIndex: mcAnswer,
      textAnswer: q.type === "short_answer" ? textAnswer : undefined,
      correct,
    };
    setAllAnswers((prev) => [...prev, answer]);
  }

  function finishQuiz(answers: QuizAnswer[]) {
    const score = answers.filter((a) => a.correct).length;
    onComplete(answers, score, quiz.questions.length);
  }

  function nextQuestion() {
    if (current < quiz.questions.length - 1) {
      setCurrent((c) => c + 1);
      setMcAnswer(undefined);
      setTextAnswer("");
      setRevealed(false);
    } else {
      setAllAnswers((prev) => {
        finishQuiz(prev);
        return prev;
      });
    }
  }

  const canCheck =
    q.type === "short_answer" ? textAnswer.trim().length > 0 : mcAnswer !== undefined;

  return (
    <div className="px-4 py-6 pb-32 learn-animate-in">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-learn-ink-muted">← 돌아가기</button>
        <div className="flex items-center gap-2">
          {quiz.source === "openai" && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-learn-primary">AI 출제</span>
          )}
          <span className="text-xs font-bold text-learn-primary">
            {current + 1} / {quiz.questions.length}
          </span>
        </div>
      </div>

      <div className="mb-2 flex gap-1">
        {quiz.questions.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < current ? "bg-learn-primary" : i === current ? "bg-learn-primary/50" : "bg-learn-muted"
            }`}
          />
        ))}
      </div>

      <p className="mb-1 text-[11px] font-semibold text-learn-ink-subtle">
        {q.type === "short_answer" ? "단답형" : "객관식"}
        {q.sectionTitle && ` · ${q.sectionTitle}`}
      </p>
      <h2 className="text-lg font-bold leading-snug text-learn-ink">{q.question}</h2>

      {!revealed && q.type === "multiple_choice" && (
        <div className="mt-6 flex flex-col gap-3">
          {q.options?.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMcAnswer(i)}
              className={`rounded-2xl border px-4 py-4 text-left text-sm font-medium transition-all active:scale-[0.98] ${
                mcAnswer === i
                  ? "border-learn-primary bg-learn-primary/10 text-learn-ink"
                  : "border-learn-border bg-learn-surface text-learn-ink"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {!revealed && q.type === "short_answer" && (
        <div className="mt-6">
          <input
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="정답을 입력하세요"
            className="h-14 w-full rounded-2xl border border-learn-border px-4 text-base outline-none focus:border-learn-primary/50"
            onKeyDown={(e) => e.key === "Enter" && canCheck && checkAnswer()}
          />
        </div>
      )}

      {revealed && (
        <div className="mt-6 space-y-4 learn-animate-in">
          <div
            className={`rounded-2xl p-4 ${
              isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}
          >
            <p className={`text-base font-bold ${isCorrect ? "text-green-800" : "text-red-800"}`}>
              {isCorrect ? "정답이에요! 🎉" : "아쉬워요, 틀렸어요"}
            </p>
            {!isCorrect && q.type === "multiple_choice" && (
              <p className="mt-2 text-sm text-red-700">
                정답: {q.options?.[q.correctIndex ?? 0]}
              </p>
            )}
            {!isCorrect && q.type === "short_answer" && (
              <p className="mt-2 text-sm text-red-700">정답: {q.correctAnswer}</p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-learn-ink-muted">{q.explanation}</p>
          </div>

          {q.evidence.snippet && (
            <div className="rounded-2xl border border-learn-border bg-learn-muted/50 p-4">
              <p className="text-[11px] font-bold text-learn-primary mb-1">📎 자료 근거</p>
              <p className="text-xs leading-relaxed text-learn-ink-muted italic">
                &ldquo;{q.evidence.snippet}&rdquo;
              </p>
            </div>
          )}

          {!isCorrect && (
            <BacktrackButton evidence={q.evidence} onBacktrack={onBacktrack} />
          )}
        </div>
      )}

      <div
        className="fixed bottom-0 inset-x-0 z-30 border-t border-learn-border bg-learn-surface p-4"
        style={{ paddingBottom: "max(1rem, var(--learn-safe-bottom))" }}
      >
        {!revealed ? (
          <Button size="lg" className="w-full" disabled={!canCheck} onClick={checkAnswer}>
            정답 확인
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={nextQuestion}>
            {current < quiz.questions.length - 1 ? "다음 문제" : "결과 보기"}
          </Button>
        )}
      </div>
    </div>
  );
}
