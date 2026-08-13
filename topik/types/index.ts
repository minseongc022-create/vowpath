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
  /** YouTube channel name for attribution */
  channelName?: string;
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

export type TopikExamSection = "listening" | "reading" | "writing" | "grammar" | "vocabulary";

export type TopikQuizQuestion = {
  id: string;
  level: TopikLevel;
  type: "multiple_choice" | "short_answer";
  category: LessonCategory;
  examSection?: TopikExamSection;
  question: string;
  questionVi?: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  explanation: string;
  explanationVi: string;
  passage?: string;
  /** Original listening dialogue — shown after answering (not copied from past papers) */
  listeningScript?: string;
  listeningScriptVi?: string;
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
  examDate?: string;
  lessons: Record<string, LessonProgress>;
  writingCount: number;
  quizAttempts: number;
  reviewSessions: number;
  speakingCount: number;
  mockExamCount: number;
  typingCount: number;
  bestTypingCpm?: number;
  bestMockScore?: number;
};

export type SpeakingScenarioId =
  | "self-intro"
  | "hometown"
  | "restaurant"
  | "job-eps"
  | "topik-interview"
  | "topik-presentation";

export type SpeakingScenario = {
  id: SpeakingScenarioId;
  titleVi: string;
  promptKo: string;
  promptVi: string;
  sampleAnswerKo: string;
  level: TopikLevel;
  hintsVi: string[];
};

export type SpeakingEvaluation = {
  scenarioId: SpeakingScenarioId;
  transcript: string;
  pronunciationScore: number;
  grammarScore: number;
  fluencyScore: number;
  overallScore: number;
  vietnameseErrors: VietnameseErrorFlag[];
  feedbackVi: string;
  improvedAnswerKo: string;
  source: "openai" | "demo";
};

export type VietnameseErrorFlag = {
  pattern: string;
  detected: boolean;
  explanationVi: string;
  tipVi: string;
};

export type PassProbabilityReport = {
  probability: number;
  level: TopikLevel;
  daysToExam: number | null;
  strengthsVi: string[];
  gapsVi: string[];
  dailyPlanVi: string[];
};

export type StudyPlanDay = {
  day: number;
  tasksVi: string[];
  focus: "vocab" | "grammar" | "reading" | "listening" | "writing" | "speaking" | "mock";
};

export type MockExamSection = "listening" | "reading" | "writing";

export type MockExamConfig = {
  level: TopikLevel;
  durationMin: number;
  sections: MockExamSection[];
};

export type MockExamResult = {
  id: string;
  level: TopikLevel;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  durationSec: number;
  completedAt: string;
};
