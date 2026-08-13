import type { TopikLevel } from "@/topik/types";

export type WrongRecord = {
  id: string;
  questionId: string;
  question: string;
  questionVi?: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  selectedIndex?: number;
  textAnswer?: string;
  explanationVi: string;
  level: TopikLevel;
  resolved: boolean;
  createdAt: string;
};
