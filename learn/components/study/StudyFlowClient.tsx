"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaterialRecord } from "@/learn/types/material";
import type { QuizQuestion, QuizSet } from "@/learn/types/quiz";
import { MindmapDashboard } from "@/learn/components/mindmap/MindmapDashboard";
import { KeySummaryPanel } from "@/learn/components/learn/KeySummaryPanel";
import { Button } from "@/learn/components/ui/Button";
import Link from "next/link";

type Step = "loading" | "processing" | "learn" | "quiz" | "result";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "준비 중",
  EXTRACTING: "자료 추출 중",
  CHUNKING: "내용 분석 중",
  TRANSCRIBING: "음성 변환 중",
  ANALYZING: "AI 요약 생성 중",
  READY: "완료",
  FAILED: "실패",
};

export function StudyFlowClient({ initial }: { initial: MaterialRecord }) {
  const [material, setMaterial] = useState(initial);
  const [step, setStep] = useState<Step>(
    initial.status === "READY" ? "learn" : "processing",
  );
  const [tab, setTab] = useState<"mindmap" | "summary">("mindmap");
  const [quiz, setQuiz] = useState<QuizSet | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; total: number; percent: number } | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const poll = useCallback(async () => {
    const res = await fetch(`/learn/api/library/${material.id}`);
    if (res.ok) {
      const data = (await res.json()) as MaterialRecord;
      setMaterial(data);
      if (data.status === "READY") setStep("learn");
      if (data.status === "FAILED") setStep("processing");
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

  async function startQuiz() {
    setQuizLoading(true);
    try {
      const res = await fetch(`/learn/api/quiz/${material.id}`);
      if (res.ok) {
        setQuiz(await res.json());
        setAnswers({});
        setStep("quiz");
      }
    } finally {
      setQuizLoading(false);
    }
  }

  async function submitQuiz() {
    if (!quiz) return;
    const payload = quiz.questions.map((q) => ({
      questionId: q.id,
      selectedIndex: answers[q.id] ?? -1,
      correct: answers[q.id] === q.correctIndex,
    }));
    const res = await fetch(`/learn/api/quiz/${material.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload }),
    });
    if (res.ok) {
      const data = await res.json();
      setResult({ score: data.score, total: data.total, percent: data.percent });
      setStep("result");
    }
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
        {material.status === "FAILED" ? (
          <p className="mt-4 text-sm text-red-600">{material.errorMessage ?? "처리 실패"}</p>
        ) : (
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
      <QuizStep
        quiz={quiz}
        answers={answers}
        onSelect={(qid, idx) => setAnswers((a) => ({ ...a, [qid]: idx }))}
        onSubmit={() => void submitQuiz()}
        onBack={() => setStep("learn")}
      />
    );
  }

  if (step === "result" && result) {
    return (
      <div className="px-4 py-8 learn-animate-in">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 text-5xl">{result.percent >= 80 ? "🎉" : result.percent >= 60 ? "👍" : "📚"}</div>
          <h1 className="text-2xl font-bold text-learn-ink">
            {result.score} / {result.total} 정답
          </h1>
          <p className="mt-1 text-lg font-semibold text-learn-primary">{result.percent}%</p>
          <p className="mt-3 text-sm text-learn-ink-muted">
            {result.percent >= 80
              ? "완벽해요! 오늘 학습 완료"
              : "틀린 문제는 오답노트에 저장됐어요"}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {result.percent < 80 && (
              <Link href="/learn/wrong-notes">
                <Button size="lg" className="w-full">오답노트 보기</Button>
              </Link>
            )}
            <Link href="/learn/calendar">
              <Button size="lg" variant="secondary" className="w-full">오늘 학습 기록</Button>
            </Link>
            <Button size="lg" variant="ghost" className="w-full" onClick={() => setStep("learn")}>
              다시 학습하기
            </Button>
          </div>
        </div>
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
          <MindmapDashboard material={material} compact />
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

      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-learn-border bg-learn-surface/95 backdrop-blur-lg p-4" style={{ paddingBottom: "max(1rem, var(--learn-safe-bottom))" }}>
        <Button size="lg" className="w-full" onClick={() => void startQuiz()} disabled={quizLoading || !material.analysis}>
          {quizLoading ? "퀴즈 준비 중…" : "학습 완료 · 문제 풀기 →"}
        </Button>
      </div>
    </div>
  );
}

function QuizStep({
  quiz,
  answers,
  onSelect,
  onSubmit,
  onBack,
}: {
  quiz: QuizSet;
  answers: Record<string, number>;
  onSelect: (qid: string, idx: number) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);
  const [current, setCurrent] = useState(0);
  const q = quiz.questions[current]!;

  return (
    <div className="px-4 py-6 pb-28 learn-animate-in">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-learn-ink-muted">← 돌아가기</button>
        <span className="text-xs font-bold text-learn-primary">
          {current + 1} / {quiz.questions.length}
        </span>
      </div>

      <h2 className="text-lg font-bold leading-snug text-learn-ink">{q.question}</h2>
      {q.sectionTitle && (
        <p className="mt-1 text-xs text-learn-ink-subtle">{q.sectionTitle}</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {q.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(q.id, i)}
            className={`rounded-2xl border px-4 py-4 text-left text-sm font-medium transition-all active:scale-[0.98] ${
              answers[q.id] === i
                ? "border-learn-primary bg-learn-primary/10 text-learn-ink"
                : "border-learn-border bg-learn-surface text-learn-ink hover:border-learn-primary/40"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-learn-border bg-learn-surface p-4" style={{ paddingBottom: "max(1rem, var(--learn-safe-bottom))" }}>
        {current < quiz.questions.length - 1 ? (
          <Button
            size="lg"
            className="w-full"
            disabled={answers[q.id] === undefined}
            onClick={() => setCurrent((c) => c + 1)}
          >
            다음 문제
          </Button>
        ) : (
          <Button size="lg" className="w-full" disabled={!allAnswered} onClick={onSubmit}>
            결과 확인
          </Button>
        )}
      </div>
    </div>
  );
}
