export type TopikLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type TopikTier = "topik-i" | "topik-ii";

export type LessonCategory = "grammar" | "vocabulary" | "reading" | "listening" | "writing";

export type TopikLesson = {
  id: string;
  level: TopikLevel;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  category: LessonCategory;
  durationMin: number;
  videoUrl?: string;
  vocabulary: VocabItem[];
  grammarPoints: GrammarPoint[];
  sortOrder: number;
};

export type VocabItem = {
  id: string;
  korean: string;
  romanization?: string;
  vietnamese: string;
  example?: string;
  exampleVi?: string;
};

export type GrammarPoint = {
  id: string;
  pattern: string;
  meaningVi: string;
  example: string;
  exampleVi: string;
};

export type TopikQuizQuestion = {
  id: string;
  level: TopikLevel;
  type: "multiple_choice" | "short_answer";
  category: LessonCategory;
  question: string;
  questionVi?: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation: string;
  explanationVi: string;
  passage?: string;
};

export type WritingTaskType = "51" | "52" | "53" | "54";

export type WritingCorrectionRequest = {
  taskType: WritingTaskType;
  prompt: string;
  answer: string;
  wordLimit?: number;
};

export type SentenceCorrection = {
  original: string;
  corrected: string;
  explanationVi: string;
};

export type WritingCorrectionResult = {
  taskType: WritingTaskType;
  estimatedScore: number;
  maxScore: number;
  taskFulfillment: number;
  structure: number;
  languageUse: number;
  overallFeedbackVi: string;
  strengthsVi: string[];
  improvementsVi: string[];
  sentenceCorrections: SentenceCorrection[];
  modelAnswer?: string;
  modelAnswerVi?: string;
  source: "openai" | "demo";
};

export type SrsCard = {
  id: string;
  kind: "vocab" | "grammar" | "quiz";
  front: string;
  back: string;
  backVi: string;
  level: TopikLevel;
  lessonId?: string;
  questionId?: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt?: string;
  createdAt: string;
};

export type LessonProgress = {
  lessonId: string;
  completed: boolean;
  watchedSec: number;
  lastAccessedAt: string;
};

export type UserProgress = {
  targetLevel: TopikLevel;
  streak: number;
  lastStudyDate?: string;
  lessons: Record<string, LessonProgress>;
  writingCount: number;
  quizAttempts: number;
  reviewSessions: number;
};
