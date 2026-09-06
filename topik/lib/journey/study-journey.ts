import type { PassProbabilityReport, StudyPlanDay, TopikLevel, UserProgress } from "@/topik/types";
import { getNextIncompleteLesson } from "@/topik/lib/curriculum/lessons";
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

/** Full learning path — diagnostic → lesson → review → skills → mock */
export function buildStudyJourney(input: Input): StudyJourney {
  const { progress, wrongCount, report, todayFocus, dueCards } = input;
  const steps: JourneyStep[] = [];
  let order = 1;
  const level = progress.targetLevel;
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = progress.dailyStepsDone?.[today] ?? [];

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

  const nextLesson = getNextIncompleteLesson(progress);
  if (nextLesson) {
    steps.push({
      id: "lesson",
      order: order++,
      titleVi: l("Video bài học", "영상 수업"),
      descVi: nextLesson.titleVi,
      href: `/topik/lessons/${nextLesson.level}/${nextLesson.id}`,
      status: "upcoming",
      whyVi: l("Nền tảng ngữ pháp & từ vựng", "문법·어휘 기초"),
    });
  }

  if (dueCards > 0) {
    steps.push({
      id: "srs",
      order: order++,
      titleVi: l("Ôn SRS", "SRS 복습"),
      descVi: l(`${dueCards} thẻ đến hạn`, `복습 ${dueCards}장`),
      href: "/topik/review",
      status: "upcoming",
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
      href: `/topik/practice?level=${level}`,
      status: "upcoming",
    });
  }

  if (todayFocus === "vocab" || todayFocus === "grammar") {
    steps.push({
      id: "vocab",
      order: order++,
      titleVi: l("Sổ từ vựng", "단어장"),
      descVi: l("TOPIK từ theo cấp", "급수별 TOPIK 어휘"),
      href: "/topik/vocab",
      status: "upcoming",
    });
  }

  if (todayFocus === "speaking" || level >= 3) {
    steps.push({
      id: "speaking",
      order: order++,
      titleVi: l("Luyện nói IBT", "IBT 말하기"),
      descVi: l("AI chấm + sửa phát âm", "AI 채점 + 발음"),
      href: "/topik/speaking",
      status: "upcoming",
    });
  }

  if (todayFocus === "writing" || level >= 4) {
    steps.push({
      id: "writing",
      order: order++,
      titleVi: l("Chấm bài viết", "쓰기 채점"),
      descVi: l("Q51–54", "51–54번"),
      href: "/topik/writing",
      status: "upcoming",
    });
  }

  if (level >= 3 && ((progress.bestTypingCpm ?? 0) < 30 || todayFocus === "writing")) {
    steps.push({
      id: "typing",
      order: order++,
      titleVi: l("Luyện gõ IBT", "IBT 타이핑"),
      descVi: l("30+ ký tự/phút", "30+타/분"),
      href: "/topik/typing",
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
  const dailyTotal = Math.min(steps.length, 6);

  let foundCurrent = false;
  for (const step of steps) {
    if (isStepDone(step.id, progress, wrongCount, dueCards)) {
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
    steps: steps.slice(0, 6),
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

function isStepDone(
  id: string,
  progress: UserProgress,
  wrongCount: number,
  dueCards: number,
): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = progress.dailyStepsDone?.[today] ?? [];

  if (doneToday.includes(id)) return true;
  if (id === "wrong" && wrongCount === 0) return true;
  if (id === "placement" && progress.placementLevel) return true;
  if (id === "srs" && dueCards === 0) return true;
  if (id === "lesson") {
    const next = getNextIncompleteLesson(progress);
    if (!next) return true;
  }
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
