import { getNextIncompleteLesson, tierForLevel } from "@/topik/lib/curriculum/lessons";
import { l } from "@/topik/lib/i18n/locale-text";
import type {
  PassProbabilityReport,
  StudyPlanDay,
  TopikLevel,
  UserProgress,
} from "@/topik/types";

export type AcademyPhase = "foundation" | "build" | "sprint";

export type AcademyTaskKind =
  | "placement"
  | "lesson"
  | "drill"
  | "practice"
  | "mock"
  | "wrong"
  | "speaking"
  | "writing"
  | "typing"
  | "review";

export type AcademyTask = {
  id: string;
  kind: AcademyTaskKind;
  labelVi: string;
  labelKo: string;
  descVi: string;
  descKo: string;
  href: string;
  durationMin?: number;
};

export type AcademyDailyClass = {
  planDay: number;
  totalDays: number;
  phase: AcademyPhase;
  phaseTitleVi: string;
  phaseTitleKo: string;
  phaseDescVi: string;
  phaseDescKo: string;
  focusVi: string;
  focusKo: string;
  tasks: AcademyTask[];
  coachVi: string;
  coachKo: string;
};

const FOCUS_LABELS: Record<StudyPlanDay["focus"], { vi: string; ko: string }> = {
  vocab: { vi: "Từ vựng + SRS", ko: "어휘 + SRS" },
  grammar: { vi: "Ngữ pháp", ko: "문법" },
  reading: { vi: "Đọc hiểu", ko: "독해" },
  listening: { vi: "Nghe hiểu", ko: "듣기" },
  speaking: { vi: "Nói IBT", ko: "IBT 말하기" },
  writing: { vi: "Viết TOPIK", ko: "TOPIK 쓰기" },
  mock: { vi: "Thi thử", ko: "모의고사" },
};

export function getPlanPhase(planDay: number, totalDays: number): AcademyPhase {
  const pct = planDay / Math.max(totalDays, 1);
  if (pct <= 0.33) return "foundation";
  if (pct <= 0.75) return "build";
  return "sprint";
}

function phaseCopy(phase: AcademyPhase): {
  titleVi: string;
  titleKo: string;
  descVi: string;
  descKo: string;
} {
  switch (phase) {
    case "foundation":
      return {
        titleVi: "Giai đoạn 1 — Nền tảng",
        titleKo: "1단계 — 기초",
        descVi: "Như tuần đầu lớp học: hangul, từ vựng, ngữ pháp cơ bản",
        descKo: "학원 1~2주차: 한글, 기초 어휘·문법",
      };
    case "build":
      return {
        titleVi: "Giai đoạn 2 — Kỹ năng thi",
        titleKo: "2단계 — 실력 향상",
        descVi: "Nghe · đọc · viết · nói theo format TOPIK/IBT",
        descKo: "TOPIK/IBT 형식별 듣기·독해·쓰기·말하기",
      };
    case "sprint":
      return {
        titleVi: "Giai đoạn 3 — Về đích",
        titleKo: "3단계 — 마무리",
        descVi: "Thi thử, sửa lỗi, tăng khả năng đậu",
        descKo: "모의고사, 오답, 합격률 끌어올리기",
      };
  }
}

function focusDrillHref(focus: StudyPlanDay["focus"], level: TopikLevel): string {
  switch (focus) {
    case "listening":
      return `/topik/drill?type=listening&level=${level}`;
    case "reading":
      return `/topik/drill?type=reading&level=${level}`;
    case "mock":
      return `/topik/mock-exam?tier=${tierForLevel(level)}`;
    case "speaking":
      return "/topik/speaking";
    case "writing":
      return "/topik/writing";
    case "vocab":
      return `/topik/practice?category=vocabulary&level=${level}`;
    case "grammar":
      return `/topik/practice?category=grammar&level=${level}`;
    default:
      return `/topik/drill?type=mixed&level=${level}`;
  }
}

function gapDrillHref(progress: UserProgress): string | null {
  const gaps = progress.placementGaps ?? [];
  const level = progress.targetLevel;
  if (gaps.includes("listening")) return `/topik/drill?type=listening&level=${level}`;
  if (gaps.includes("reading")) return `/topik/drill?type=reading&level=${level}`;
  if (gaps.includes("grammar")) return `/topik/practice?category=grammar&level=${level}`;
  if (gaps.includes("vocabulary")) return `/topik/practice?category=vocabulary&level=${level}`;
  return null;
}

export function buildAcademyDailyClass(input: {
  progress: UserProgress;
  todayPlan: StudyPlanDay | null;
  planDay: number;
  totalDays: number;
  report: PassProbabilityReport;
  wrongCount: number;
  dueCards: number;
}): AcademyDailyClass {
  const { progress, todayPlan, planDay, totalDays, report, wrongCount, dueCards } = input;
  const phase = getPlanPhase(planDay, totalDays);
  const phaseMeta = phaseCopy(phase);
  const focus = todayPlan?.focus ?? "grammar";
  const focusLabels = FOCUS_LABELS[focus];
  const level = progress.targetLevel;
  const tasks: AcademyTask[] = [];

  if (!progress.placementLevel) {
    tasks.push({
      id: "placement",
      kind: "placement",
      labelVi: "Kiểm tra trình độ TOPIK",
      labelKo: "TOPIK 레벨 테스트",
      descVi: "12 câu — biết cấp độ và điểm yếu trước khi vào lớp",
      descKo: "12문항 — 수업 전 급수·약점 진단",
      href: "/topik/placement",
      durationMin: 12,
    });
    return {
      planDay,
      totalDays,
      phase,
      phaseTitleVi: phaseMeta.titleVi,
      phaseTitleKo: phaseMeta.titleKo,
      phaseDescVi: phaseMeta.descVi,
      phaseDescKo: phaseMeta.descKo,
      focusVi: focusLabels.vi,
      focusKo: focusLabels.ko,
      tasks,
      coachVi: l(
        "Bước bắt buộc như buổi phân lớp học viện — làm xong mới có lộ trình cá nhân.",
        "학원 반 배치 테스트처럼 — 완료 후 맞춤 로드맵 제공.",
      ),
      coachKo: "학원 반 배치 테스트처럼 — 완료 후 맞춤 로드맵 제공.",
    };
  }

  const nextLesson = getNextIncompleteLesson(progress);
  if (nextLesson) {
    tasks.push({
      id: "lesson",
      kind: "lesson",
      labelVi: `Bài học: ${nextLesson.titleVi}`,
      labelKo: `수업: ${nextLesson.title}`,
      descVi: `${nextLesson.durationMin} phút video + từ vựng + ngữ pháp`,
      descKo: `${nextLesson.durationMin}분 영상 + 어휘 + 문법`,
      href: `/topik/lessons/${nextLesson.level}/${nextLesson.id}`,
      durationMin: nextLesson.durationMin,
    });
  }

  if (dueCards > 0) {
    tasks.push({
      id: "review",
      kind: "review",
      labelVi: `Ôn SRS (${dueCards} thẻ)`,
      labelKo: `SRS 복습 (${dueCards}장)`,
      descVi: "Ôn đúng lúc — nhớ từ vựng lâu",
      descKo: "적시 반복 — 어휘 장기 기억",
      href: "/topik/review",
      durationMin: Math.min(15, Math.max(5, dueCards)),
    });
  }

  if (focus === "vocab" || phase === "foundation") {
    tasks.push({
      id: "vocab",
      kind: "practice",
      labelVi: "Sổ từ vựng TOPIK",
      labelKo: "TOPIK 단어장",
      descVi: "Chạm từ → nghĩa + phát âm",
      descKo: "단어 탭 → 뜻 + 발음",
      href: "/topik/vocab",
      durationMin: 10,
    });
  }

  const weakHref = gapDrillHref(progress);
  tasks.push({
    id: "drill",
    kind: "drill",
    labelVi: weakHref ? "Drill điểm yếu (chẩn đoán)" : `Drill ${focusLabels.vi}`,
    labelKo: weakHref ? "약점 드릴 (진단 기반)" : `${focusLabels.ko} 드릴`,
    descVi: "10 câu IBT · khó hơn đề thật một chút",
    descKo: "IBT 10문항 · 실전보다 약간 어렵게",
    href: weakHref ?? focusDrillHref(focus, level),
    durationMin: 15,
  });

  if (phase !== "foundation" && (planDay % 4 === 0 || focus === "reading")) {
    tasks.push({
      id: "order-drill",
      kind: "drill",
      labelVi: "Sắp xếp câu IBT",
      labelKo: "IBT 문장 배열",
      descVi: "Dạng kéo-thả thi máy",
      descKo: "IBT 배열형 드릴",
      href: `/topik/drill?type=order&level=${level}`,
      durationMin: 10,
    });
  }

  tasks.push({
    id: "practice",
    kind: "practice",
    labelVi: "Luyện đề theo cấp",
    labelKo: "급수별 문제 풀이",
    descVi: `TOPIK ${level} · trắc nghiệm có giải thích`,
    descKo: `TOPIK ${level} · 해설 포함`,
    href: `/topik/practice?level=${level}`,
    durationMin: 20,
  });

  if (level >= 3 && (focus === "writing" || planDay % 3 === 0 || (progress.bestTypingCpm ?? 0) < 30)) {
    tasks.push({
      id: "typing",
      kind: "typing",
      labelVi: "Luyện gõ tiếng Hàn (IBT)",
      labelKo: "한국어 타이핑 (IBT)",
      descVi: "Mục tiêu 30+ ký tự/phút",
      descKo: "목표 30+타/분",
      href: "/topik/typing",
      durationMin: 10,
    });
  }

  if (focus === "speaking" || level >= 3) {
    tasks.push({
      id: "speaking",
      kind: "speaking",
      labelVi: "Luyện nói IBT + AI chấm",
      labelKo: "IBT 말하기 + AI 채점",
      descVi: "Sửa lỗi phát âm người Việt",
      descKo: "베트남 학습자 발음 교정",
      href: "/topik/speaking",
      durationMin: 10,
    });
  }

  if (focus === "writing" || level >= 4) {
    tasks.push({
      id: "writing",
      kind: "writing",
      labelVi: "Chấm bài viết Q51–54",
      labelKo: "쓰기 51–54번 채점",
      descVi: "Tiêu chí thi thật · AI chấm",
      descKo: "실전 기준 · AI 채점",
      href: "/topik/writing",
      durationMin: 15,
    });
  }

  if (planDay % 7 === 0 || focus === "mock" || phase === "sprint") {
    tasks.push({
      id: "mock",
      kind: "mock",
      labelVi: "Thi thử mini TOPIK",
      labelKo: "TOPIK 미니 모의고사",
      descVi: "20 phút · đồng hồ · chấm tự động",
      descKo: "20분 · 타이머 · 자동 채점",
      href: `/topik/mock-exam?tier=${tierForLevel(level)}`,
      durationMin: 20,
    });
  }

  if (wrongCount > 0) {
    tasks.push({
      id: "wrong",
      kind: "wrong",
      labelVi: `Sửa ${wrongCount} câu sai`,
      labelKo: `오답 ${wrongCount}문항`,
      descVi: "Ghi chú lỗi — ôn đến khi thuộc",
      descKo: "오답 정리 — 맞출 때까지",
      href: "/topik/wrong-notes",
      durationMin: 10,
    });
  }

  let coachVi: string;
  let coachKo: string;
  if (report.probability >= 70) {
    coachVi = `Khả năng đậu ${report.probability}% — làm đủ các bước dưới đây.`;
    coachKo = `합격 가능성 ${report.probability}% — 아래 단계를 완료하세요.`;
  } else if (report.daysToExam !== null && report.daysToExam <= 21) {
    coachVi = `Còn ${report.daysToExam} ngày — ưu tiên mock + sửa lỗi + drill yếu.`;
    coachKo = `${report.daysToExam}일 남음 — 모의고사 + 오답 + 약점 드릴 우선.`;
  } else {
    coachVi = "Làm lần lượt từ trên xuống — đủ 1 buổi học TOPIK (45–60 phút).";
    coachKo = "위에서 순서대로 — TOPIK 1회 수업 분량(45–60분).";
  }

  return {
    planDay,
    totalDays,
    phase,
    phaseTitleVi: phaseMeta.titleVi,
    phaseTitleKo: phaseMeta.titleKo,
    phaseDescVi: phaseMeta.descVi,
    phaseDescKo: phaseMeta.descKo,
    focusVi: focusLabels.vi,
    focusKo: focusLabels.ko,
    tasks,
    coachVi,
    coachKo,
  };
}
