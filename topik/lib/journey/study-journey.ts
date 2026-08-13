import type { PassProbabilityReport, StudyPlanDay, TopikLevel, UserProgress } from "@/topik/types";

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

/**
 * Guided study path — inspired by Duolingo (one clear next step), Babbel (structure),
 * Migii (weak-area focus), Anki (review before new). Avoids: ads, confusing UI, no progress sync.
 */
export function buildStudyJourney(input: Input): StudyJourney {
  const { progress, dueCards, wrongCount, todayFocus, report } = input;
  const steps: JourneyStep[] = [];
  let order = 1;

  // 1. SRS first (Anki/Duolingo: review due before new)
  if (dueCards > 0) {
    steps.push({
      id: "srs",
      order: order++,
      titleVi: "Ôn tập SRS",
      descVi: `${dueCards} thẻ đến hạn — nhớ lâu, quên chậm`,
      href: "/topik/review",
      status: "upcoming",
      whyVi: "Lặp lại đúng lúc giúp nhớ từ vựng lâu hơn 80%",
    });
  }

  // 2. Wrong notes (Migii weakness: we fix with auto SRS + dedicated step)
  if (wrongCount > 0) {
    steps.push({
      id: "wrong",
      order: order++,
      titleVi: "Sửa câu sai",
      descVi: `${wrongCount} câu chưa thuộc — ôn đến khi đúng`,
      href: "/topik/wrong-notes",
      status: "upcoming",
      whyVi: "Học từ lỗi nhanh hơn làm đề mới mù quáng",
    });
  }

  // 3. Placement if never done
  if (!progress.placementLevel) {
    steps.push({
      id: "placement",
      order: order++,
      titleVi: "Kiểm tra trình độ",
      descVi: "8 câu nhanh — biết điểm yếu ngay",
      href: "/topik/placement",
      status: "upcoming",
      whyVi: "Migii có entrance test — chúng ta cũng có, miễn phí",
    });
  }

  // 4. Focus-based practice (Babbel structured module)
  const focusStep = focusToStep(todayFocus, progress);
  if (focusStep) {
    steps.push({ ...focusStep, order: order++ });
  }

  // 5. Section drill — weak area from report
  const weakSection = pickWeakSection(report, progress);
  steps.push({
    id: "section-drill",
    order: order++,
    titleVi: `Luyện ${weakSection.labelVi}`,
    descVi: weakSection.descVi,
    href: weakSection.href,
    status: "upcoming",
    whyVi: "Luyện theo điểm yếu — cách Migii/Duolingo adaptive",
  });

  // 6. Mock exam (Migii strength — we add no paywall)
  const mockDue =
    !progress.bestMockScore ||
    progress.mockExamCount < 1 ||
    (report.daysToExam !== null && report.daysToExam <= 21);
  if (mockDue) {
    const tier = progress.targetLevel <= 2 ? "topik-i" : "topik-ii";
    steps.push({
      id: "mock",
      order: order++,
      titleVi: progress.targetLevel <= 2 ? "Thi thử TOPIK I" : "Thi thử TOPIK II / IBT",
      descVi: "20 phút · đồng hồ · chấm điểm tự động",
      href: `/topik/mock-exam?tier=${tier}`,
      status: "upcoming",
      whyVi: "Thi thử sát thật — tự tin trước ngày thi",
    });
  }

  // Mark statuses: first 2 actionable as current/upcoming, completed ones as done
  const dailyCompleted = progress.dailyGoalCompleted ?? 0;
  const dailyTotal = Math.min(steps.length, 5);

  let foundCurrent = false;
  for (const step of steps) {
    if (isStepDone(step.id, progress, dueCards, wrongCount)) {
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

  const confidenceVi = buildConfidenceMessage(report, progress);

  return {
    steps: steps.slice(0, 6),
    currentStep,
    dailyCompleted: Math.min(dailyCompleted, dailyTotal),
    dailyTotal,
    confidenceVi,
  };
}

function focusToStep(
  focus: StudyPlanDay["focus"] | undefined,
  progress: UserProgress,
): Omit<JourneyStep, "order"> | null {
  switch (focus) {
    case "speaking":
      return {
        id: "speaking",
        titleVi: "Luyện nói IBT",
        descVi: "6 dạng bài nói · AI chấm + sửa lỗi người Việt",
        href: "/topik/speaking",
        status: "upcoming",
      };
    case "writing":
      return {
        id: "writing",
        titleVi: "Chấm bài viết TOPIK",
        descVi: "Q51–54 · tiêu chí thi thật",
        href: "/topik/writing",
        status: "upcoming",
      };
    case "listening":
      return {
        id: "listening",
        titleVi: "Luyện nghe + script",
        descVi: "Script tiếng Việt · không như app lỗi audio",
        href: "/topik/practice?category=listening",
        status: "upcoming",
      };
    case "reading":
      return {
        id: "reading",
        titleVi: "Luyện đọc hiểu",
        descVi: "Đoạn văn TOPIK + giải thích",
        href: "/topik/practice?category=reading",
        status: "upcoming",
      };
    case "mock":
      return {
        id: "mock-focus",
        titleVi: "Thi thử mini",
        descVi: "20 phút · lưu điểm cao nhất",
        href: "/topik/mock-exam",
        status: "upcoming",
      };
    case "vocab":
    case "grammar":
    default:
      if ((progress.bestTypingCpm ?? 0) < 30 && progress.targetLevel >= 3) {
        return {
          id: "typing",
          titleVi: "Luyện gõ tiếng Hàn",
          descVi: "Mục tiêu 30+ ký tự/phút cho IBT",
          href: "/topik/typing",
          status: "upcoming",
        };
      }
      return {
        id: "practice",
        titleVi: "Luyện đề TOPIK",
        descVi: "Trắc nghiệm theo cấp mục tiêu",
        href: `/topik/practice?level=${progress.targetLevel}`,
        status: "upcoming",
      };
  }
}

function pickWeakSection(
  report: PassProbabilityReport,
  progress: UserProgress,
): { labelVi: string; descVi: string; href: string } {
  const gaps = report.gapsVi.join(" ").toLowerCase();
  if (gaps.includes("nói") || progress.speakingCount < 2) {
    return {
      labelVi: "nói IBT",
      descVi: "Điểm yếu phổ biến của người Việt",
      href: "/topik/speaking",
    };
  }
  if (gaps.includes("viết") || gaps.includes("gõ") || progress.writingCount < 2) {
    return {
      labelVi: "viết & gõ",
      descVi: "IBT viết trên màn hình",
      href: "/topik/typing",
    };
  }
  if (gaps.includes("thi thử") || !progress.bestMockScore) {
    return {
      labelVi: "thi thử",
      descVi: "Chưa có điểm mock — làm ngay",
      href: "/topik/mock-exam",
    };
  }
  return {
    labelVi: "nghe",
    descVi: "Script + đáp án tiếng Việt",
    href: "/topik/practice?category=listening",
  };
}

function isStepDone(
  id: string,
  progress: UserProgress,
  dueCards: number,
  wrongCount: number,
): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = progress.dailyStepsDone?.[today] ?? [];

  if (doneToday.includes(id)) return true;

  if (id === "srs" && dueCards === 0 && (progress.reviewSessions ?? 0) > 0) return true;
  if (id === "wrong" && wrongCount === 0) return true;
  if (id === "placement" && progress.placementLevel) return true;

  return false;
}

function buildConfidenceMessage(report: PassProbabilityReport, progress: UserProgress): string {
  if (report.probability >= 70) {
    return `Khả năng đậu ${report.probability}% — duy trì lộ trình, bạn sẽ sẵn sàng thi TOPIK ${progress.targetLevel}!`;
  }
  if (report.probability >= 50) {
    return `Đang tiến bộ (${report.probability}%) — làm đủ 5 bước hôm nay, điểm sẽ tăng nhanh.`;
  }
  return `Bắt đầu từ bước 1 — mỗi ngày 5 bước nhỏ, vài tuần nữa bạn sẽ thấy khác biệt rõ.`;
}

export function estimateLevelFromPlacement(correct: number, total: number): TopikLevel {
  const pct = correct / total;
  if (pct >= 0.9) return 4;
  if (pct >= 0.75) return 3;
  if (pct >= 0.6) return 2;
  return 1;
}
