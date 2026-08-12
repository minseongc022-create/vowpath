export type QuizQuestionType = "multiple_choice" | "short_answer";

export type QuizEvidence = {
  snippet: string;
  startSec?: number;
  lineId?: string;
  nodeId?: string;
  sectionTitle?: string;
};

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  question: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation: string;
  sectionTitle?: string;
  evidence: QuizEvidence;
};

export type QuizSet = {
  materialId: string;
  title: string;
  questions: QuizQuestion[];
  generatedAt: string;
  source: "openai" | "fallback";
};

export type QuizAnswer = {
  questionId: string;
  type: QuizQuestionType;
  selectedIndex?: number;
  textAnswer?: string;
  correct: boolean;
};

export type QuizAttempt = {
  id: string;
  materialId: string;
  materialTitle: string;
  score: number;
  total: number;
  answers: QuizAnswer[];
  completedAt: string;
};

export type WrongAnswerRecord = {
  id: string;
  materialId: string;
  materialTitle: string;
  questionId: string;
  question: string;
  type: QuizQuestionType;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  selectedIndex?: number;
  textAnswer?: string;
  explanation: string;
  evidence: QuizEvidence;
  createdAt: string;
  resolved: boolean;
};

export type DailyActivity = {
  date: string;
  materialIds: string[];
  materialTitles: string[];
  quizAttempts: number;
  avgScore: number | null;
  totalQuestions: number;
  correctCount: number;
};

export type TutorMessage = {
  role: "user" | "assistant";
  content: string;
};
