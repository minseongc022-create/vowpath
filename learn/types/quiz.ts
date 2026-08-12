export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sectionTitle?: string;
};

export type QuizSet = {
  materialId: string;
  title: string;
  questions: QuizQuestion[];
  generatedAt: string;
};

export type QuizAnswer = {
  questionId: string;
  selectedIndex: number;
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
  options: string[];
  correctIndex: number;
  selectedIndex: number;
  explanation: string;
  createdAt: string;
  resolved: boolean;
};

export type DailyActivity = {
  date: string; // YYYY-MM-DD
  materialIds: string[];
  materialTitles: string[];
  quizAttempts: number;
  avgScore: number | null;
  totalQuestions: number;
  correctCount: number;
};
