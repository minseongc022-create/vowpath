import type { PassProbabilityReport, StudyPlanDay, TopikLevel, UserProgress } from "@/topik/types";
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
      titleVi: l("Ôn tập SRS", "SRS 복습"),
      descVi: l(`${dueCards} thẻ đến hạn — nhớ lâu, quên chậm`, `복습 ${dueCards}장 — 오래 기억`),
      href: "/topik/review",
      status: "upcoming",
      whyVi: l("Lặp lại đúng lúc giúp nhớ từ vựng lâu hơn 80%", "적시 반복으로 어휘 기억 80% 향상"),
    });
  }

  // 2. Wrong notes (Migii weakness: we fix with auto SRS + dedicated step)
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

  // 3b. Vocab drill — built-in dictionary + TTS (no external lookup)
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = progress.dailyStepsDone?.[today] ?? [];
  if (!doneToday.includes("vocab")) {
    steps.push({
      id: "vocab",
      order: order++,
      titleVi: l("Sổ từ vựng TOPIK", "TOPIK 단어장"),
      descVi: l("Chạm từ → nghĩa tiếng Việt + phát âm", "단어 탭 → 뜻 + 발음"),
      href: "/topik/vocab",
      status: "upcoming",
      whyVi: l("Học từ trong app — không cần tra từ điển ngoài", "앱 내 단어 — 외부 사전 불필요"),
    });
  }

  // 4. Placement if never done
  if (!progress.placementLevel) {
    steps.push({
      id: "placement",
      order: order++,
      titleVi: l("Kiểm tra trình độ", "레벨 테스트"),
      descVi: l("8 câu nhanh — biết điểm yếu ngay", "8문항 빠른 진단"),
      href: "/topik/placement",
      status: "upcoming",
      whyVi: l("Migii có entrance test — chúng ta cũng có, miễn phí", "Migii 입학 테스트 — 우리도 무료"),
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
    titleVi: l(`Luyện ${weakSection.labelVi}`, `${weakSection.labelVi} 연습`),
    descVi: weakSection.descVi,
    href: weakSection.href,
    status: "upcoming",
    whyVi: l("Luyện theo điểm yếu — cách Migii/Duolingo adaptive", "약점 맞춤 — Migii/Duolingo 방식"),
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
      titleVi: progress.targetLevel <= 2
        ? l("Thi thử TOPIK I", "TOPIK I 모의고사")
        : l("Thi thử TOPIK II / IBT", "TOPIK II / IBT 모의고사"),
      descVi: l("20 phút · đồng hồ · chấm điểm tự động", "20분 · 타이머 · 자동 채점"),
      href: `/topik/mock-exam?tier=${tier}`,
      status: "upcoming",
      whyVi: l("Thi thử sát thật — tự tin trước ngày thi", "실전 같은 모의고사"),
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
        titleVi: l("Luyện nói IBT", "IBT 말하기"),
        descVi: l("6 dạng bài nói · AI chấm + sửa lỗi người Việt", "말하기 6유형 · AI 채점"),
        href: "/topik/speaking",
        status: "upcoming",
      };
    case "writing":
      return {
        id: "writing",
        titleVi: l("Chấm bài viết TOPIK", "TOPIK 쓰기 채점"),
        descVi: l("Q51–54 · tiêu chí thi thật", "51–54번 · 실전 기준"),
        href: "/topik/writing",
        status: "upcoming",
      };
    case "listening":
      return {
        id: "listening",
        titleVi: l("Luyện nghe + script", "듣기 + 스크립트"),
        descVi: l("Script tiếng Việt · không như app lỗi audio", "스크립트 제공 · 오디오 버그 없음"),
        href: "/topik/practice?category=listening",
        status: "upcoming",
      };
    case "reading":
      return {
        id: "reading",
        titleVi: l("Luyện đọc hiểu", "독해 연습"),
        descVi: l("Đoạn văn TOPIK + giải thích", "TOPIK 지문 + 해설"),
        href: "/topik/practice?category=reading",
        status: "upcoming",
      };
    case "mock":
      return {
        id: "mock-focus",
        titleVi: l("Thi thử mini", "미니 모의고사"),
        descVi: l("20 phút · lưu điểm cao nhất", "20분 · 최고 점수 저장"),
        href: "/topik/mock-exam",
        status: "upcoming",
      };
    case "vocab":
      return {
        id: "vocab",
        titleVi: l("Sổ từ vựng TOPIK", "TOPIK 단어장"),
        descVi: l("Chạm từ → nghĩa + phát âm", "단어 탭 → 뜻 + 발음"),
        href: "/topik/vocab",
        status: "upcoming",
      };
    case "grammar":
    default:
      if ((progress.bestTypingCpm ?? 0) < 30 && progress.targetLevel >= 3) {
        return {
          id: "typing",
          titleVi: l("Luyện gõ tiếng Hàn", "한국어 타이핑"),
          descVi: l("Mục tiêu 30+ ký tự/phút cho IBT", "IBT 목표 30+타/분"),
          href: "/topik/typing",
          status: "upcoming",
        };
      }
      return {
        id: "practice",
        titleVi: l("Luyện đề TOPIK", "TOPIK 문제 풀이"),
        descVi: l("Trắc nghiệm theo cấp mục tiêu", "목표 급수 맞춤 객관식"),
        href: `/topik/practice?level=${progress.targetLevel}`,
        status: "upcoming",
      };
  }
}

function pickWeakSection(
  report: PassProbabilityReport,
  progress: UserProgress,
): { labelVi: string; descVi: string; href: string } {
  if (progress.speakingCount < 2) {
    return {
      labelVi: l("nói IBT", "IBT 말하기"),
      descVi: l("Điểm yếu phổ biến của người Việt", "베트남 학습자 흔한 약점"),
      href: "/topik/speaking",
    };
  }
  if (progress.writingCount < 2 || (progress.bestTypingCpm ?? 0) < 30) {
    return {
      labelVi: l("viết & gõ", "쓰기 & 타이핑"),
      descVi: l("IBT viết trên màn hình", "IBT 화면 쓰기"),
      href: "/topik/typing",
    };
  }
  if (!progress.bestMockScore) {
    return {
      labelVi: l("thi thử", "모의고사"),
      descVi: l("Chưa có điểm mock — làm ngay", "모의 점수 없음 — 지금 하기"),
      href: "/topik/mock-exam",
    };
  }
  return {
    labelVi: l("nghe", "듣기"),
    descVi: l("Script + đáp án tiếng Việt", "스크립트 + 해설"),
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
  if (id === "vocab" && doneToday.includes("vocab")) return true;

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
      `Đang tiến bộ (${report.probability}%) — làm đủ 5 bước hôm nay, điểm sẽ tăng nhanh.`,
      `진행 중 (${report.probability}%) — 오늘 5단계 완료하면 점수 빠르게 상승.`,
    );
  }
  return l(
    `Bắt đầu từ bước 1 — mỗi ngày 5 bước nhỏ, vài tuần nữa bạn sẽ thấy khác biệt rõ.`,
    `1단계부터 시작 — 매일 5개 작은 단계, 몇 주 후 확실한 변화.`,
  );
}

export function estimateLevelFromPlacement(correct: number, total: number): TopikLevel {
  const pct = correct / total;
  if (pct >= 0.9) return 4;
  if (pct >= 0.75) return 3;
  if (pct >= 0.6) return 2;
  return 1;
}
