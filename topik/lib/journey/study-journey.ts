import type { PassProbabilityReport, StudyPlanDay, TopikLevel, UserProgress } from "@/topik/types";
import { estimateLevelFromScore } from "@/topik/lib/quiz/placement-scoring";
import { l } from "@/topik/lib/i18n/locale-text";

export type JourneyStepStatus = "done" | "current" | "upcoming";

export type JourneyStep = {
  id: string;
  order: number;
  titleVi: string;
  descVi: string;
  href: string;
  status: JourneyStepStatus;
  /** Why this step matters (Babbel-style clarity) */
  whyVi?: string;
};

export type StudyJourney = {
  steps: JourneyStep[];
  currentStep: JourneyStep;
  dailyCompleted: number;
  dailyTotal: number;
  confidenceVi: string;
};

type Input = {
  progress: UserProgress;
  dueCards: number;
  wrongCount: number;
  todayFocus?: StudyPlanDay["focus"];
  report: PassProbabilityReport;
};

/** Core exam-prep path only — placement → wrong notes → drill → practice → mock */
export function buildStudyJourney(input: Input): StudyJourney {
  const { progress, wrongCount, report, todayFocus } = input;
  const steps: JourneyStep[] = [];
  let order = 1;

  if (!progress.placementLevel) {
    steps.push({
      id: "placement",
      order: order++,
      titleVi: l("Kiểm tra trình độ", "레벨 테스트"),
      descVi: l("12 câu — biết cấp độ và điểm yếu ngay", "12문항 — 급수와 약점 진단"),
      href: "/topik/placement",
      status: "upcoming",
      whyVi: l("Làm trước khi luyện — tránh học sai hướng", "연습 전 진단 — 방향 오류 방지"),
    });
  }

  if (wrongCount > 0) {
    steps.push({
      id: "wrong",
      order: order++,
      titleVi: l("Sửa câu sai", "오답 수정"),
      descVi: l(`${wrongCount} câu chưa thuộc — ôn đến khi đúng`, `미암기 ${wrongCount}문항 — 맞출 때까지`),
      href: "/topik/wrong-notes",
      status: "upcoming",
      whyVi: l("Học từ lỗi nhanh hơn làm đề mới mù quáng", "오답 학습이 무분별한 새 문제보다 빠름"),
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const doneToday = progress.dailyStepsDone?.[today] ?? [];

  if (!doneToday.includes("drill")) {
    const weakSection = pickWeakSection(progress, todayFocus);
    steps.push({
      id: "drill",
      order: order++,
      titleVi: l(`Drill ${weakSection.labelVi}`, `${weakSection.labelVi} 드릴`),
      descVi: weakSection.descVi,
      href: weakSection.href,
      status: "upcoming",
      whyVi: l("Luyện theo dạng IBT — khó hơn đề thật một chút", "IBT 유형 연습 — 실전보다 약간 어렵게"),
    });
  }

  if (!doneToday.includes("practice")) {
    steps.push({
      id: "practice",
      order: order++,
      titleVi: l("Luyện đề TOPIK", "TOPIK 문제 풀이"),
      descVi: l("Trắc nghiệm theo cấp mục tiêu", "목표 급수 맞춤 객관식"),
      href: `/topik/practice?level=${progress.targetLevel}`,
      status: "upcoming",
    });
  }

  const mockDue =
    !progress.bestMockScore ||
    progress.mockExamCount < 1 ||
    (report.daysToExam !== null && report.daysToExam <= 21);
  if (mockDue) {
    const tier = progress.targetLevel <= 2 ? "topik-i" : "topik-ii";
    steps.push({
      id: "mock",
      order: order++,
      titleVi: progress.targetLevel <= 2
        ? l("Thi thử TOPIK I", "TOPIK I 모의고사")
        : l("Thi thử TOPIK II / IBT", "TOPIK II / IBT 모의고사"),
      descVi: l("20 phút · đồng hồ · chấm điểm tự động", "20분 · 타이머 · 자동 채점"),
      href: `/topik/mock-exam?tier=${tier}`,
      status: "upcoming",
      whyVi: l("Thi thử sát thật — tự tin trước ngày thi", "실전 같은 모의고사"),
    });
  }

  const dailyCompleted = progress.dailyGoalCompleted ?? 0;
  const dailyTotal = Math.min(steps.length, 4);

  let foundCurrent = false;
  for (const step of steps) {
    if (isStepDone(step.id, progress, wrongCount)) {
      step.status = "done";
    } else if (!foundCurrent) {
      step.status = "current";
      foundCurrent = true;
    } else {
      step.status = "upcoming";
    }
  }

  if (!foundCurrent && steps.length > 0) {
    steps[steps.length - 1]!.status = "current";
  }

  const currentStep = steps.find((s) => s.status === "current") ?? steps[0]!;

  return {
    steps: steps.slice(0, 5),
    currentStep,
    dailyCompleted: Math.min(dailyCompleted, dailyTotal),
    dailyTotal,
    confidenceVi: buildConfidenceMessage(report, progress),
  };
}

function pickWeakSection(
  progress: UserProgress,
  todayFocus?: StudyPlanDay["focus"],
): { labelVi: string; descVi: string; href: string } {
  const level = progress.targetLevel;
  const gaps = progress.placementGaps ?? [];

  if (todayFocus === "listening" || gaps.includes("listening")) {
    return {
      labelVi: l("nghe IBT", "IBT 듣기"),
      descVi: l("10 câu nghe · script tiếng Việt", "듣기 10문항 · 스크립트"),
      href: `/topik/drill?type=listening&level=${level}`,
    };
  }
  if (todayFocus === "reading" || gaps.includes("reading")) {
    return {
      labelVi: l("đọc IBT", "IBT 독해"),
      descVi: l("10 câu đọc hiểu", "독해 10문항"),
      href: `/topik/drill?type=reading&level=${level}`,
    };
  }
  if (
    todayFocus === "grammar" ||
    todayFocus === "vocab" ||
    gaps.includes("grammar") ||
    gaps.includes("vocabulary")
  ) {
    return {
      labelVi: l("ngữ pháp & từ", "문법 & 어휘"),
      descVi: l("Mini set hỗn hợp", "혼합 미니 세트"),
      href: `/topik/drill?type=mixed&level=${level}`,
    };
  }

  return {
    labelVi: l("IBT theo dạng", "IBT 유형별"),
    descVi: l("10 câu nghe/đọc · sắp xếp câu IBT", "듣기/읽기 10문항 · 문장 배열"),
    href: `/topik/drill?type=mixed&level=${level}`,
  };
}

function isStepDone(id: string, progress: UserProgress, wrongCount: number): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = progress.dailyStepsDone?.[today] ?? [];

  if (doneToday.includes(id)) return true;
  if (id === "wrong" && wrongCount === 0) return true;
  if (id === "placement" && progress.placementLevel) return true;
  if (id === "drill" && doneToday.includes("drill")) return true;
  if (id === "practice" && doneToday.includes("practice")) return true;

  return false;
}

function buildConfidenceMessage(report: PassProbabilityReport, progress: UserProgress): string {
  if (report.probability >= 70) {
    return l(
      `Khả năng đậu ${report.probability}% — duy trì lộ trình, bạn sẽ sẵn sàng thi TOPIK ${progress.targetLevel}!`,
      `합격 가능성 ${report.probability}% — 로드맵 유지하면 TOPIK ${progress.targetLevel} 준비 완료!`,
    );
  }
  if (report.probability >= 50) {
    return l(
      `Đang tiến bộ (${report.probability}%) — làm đủ bước hôm nay, điểm sẽ tăng nhanh.`,
      `진행 중 (${report.probability}%) — 오늘 단계 완료하면 점수 빠르게 상승.`,
    );
  }
  return l(
    `Bắt đầu từ kiểm tra trình độ — biết điểm yếu trước khi luyện đề.`,
    `레벨 테스트부터 — 연습 전 약점 파악.`,
  );
}

/** @deprecated use estimateLevelFromScore from placement-scoring */
export function estimateLevelFromPlacement(correct: number, total: number): TopikLevel {
  return estimateLevelFromScore(correct, total);
}
