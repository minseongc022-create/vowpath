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
      descVi: l(
        `${nextLesson.durationMin} phút video + từ vựng + ngữ pháp`,
        `${nextLesson.durationMin}분 영상 + 어휘 + 문법`,
      ),
      descKo: l(
        `${nextLesson.durationMin} phút video + từ vựng + ngữ pháp`,
        `${nextLesson.durationMin}분 영상 + 어휘 + 문법`,
      ),
      href: `/topik/lessons/${nextLesson.level}/${nextLesson.id}`,
      durationMin: nextLesson.durationMin,
    });
  }

  const weakHref = gapDrillHref(progress);
  tasks.push({
    id: "drill",
    kind: "drill",
    labelVi: weakHref
      ? l("Drill điểm yếu (chẩn đoán)", "약점 드릴 (진단 기반)")
      : l(`Drill ${focusLabels.vi}`, `${focusLabels.ko} 드릴`),
    labelKo: weakHref
      ? l("Drill điểm yếu (chẩn đoán)", "약점 드릴 (진단 기반)")
      : l(`Drill ${focusLabels.vi}`, `${focusLabels.ko} 드릴`),
    descVi: l("10 câu IBT · khó hơn đề thật một chút", "IBT 10문항 · 실전보다 약간 어렵게"),
    descKo: l("10 câu IBT · khó hơn đề thật một chút", "IBT 10문항 · 실전보다 약간 어렵게"),
    href: weakHref ?? focusDrillHref(focus, level),
    durationMin: 15,
  });

  tasks.push({
    id: "practice",
    kind: "practice",
    labelVi: l("Luyện đề theo cấp", "급수별 문제 풀이"),
    labelKo: l("Luyện đề theo cấp", "급수별 문제 풀이"),
    descVi: l(`TOPIK ${level} · trắc nghiệm có giải thích`, `TOPIK ${level} · 해설 포함`),
    descKo: l(`TOPIK ${level} · trắc nghiệm có giải thích`, `TOPIK ${level} · 해설 포함`),
    href: `/topik/practice?level=${level}`,
    durationMin: 20,
  });

  if (focus === "speaking" || (planDay % 7 === 3 && level >= 3)) {
    tasks.push({
      id: "speaking",
      kind: "speaking",
      labelVi: l("Luyện nói IBT + AI chấm", "IBT 말하기 + AI 채점"),
      labelKo: l("Luyện nói IBT + AI chấm", "IBT 말하기 + AI 채점"),
      descVi: l("Sửa lỗi phát âm người Việt", "베트남 학습자 발음 교정"),
      descKo: l("Sửa lỗi phát âm người Việt", "베트남 학습자 발음 교정"),
      href: "/topik/speaking",
      durationMin: 10,
    });
  }

  if (focus === "writing" || (planDay % 7 === 5 && level >= 3)) {
    tasks.push({
      id: "writing",
      kind: "writing",
      labelVi: l("Chấm bài viết Q51–54", "쓰기 51–54번 채점"),
      labelKo: l("Chấm bài viết Q51–54", "쓰기 51–54번 채점"),
      descVi: l("Tiêu chí thi thật · AI + demo", "실전 기준 · AI 채점"),
      descKo: l("Tiêu chí thi thật · AI + demo", "실전 기준 · AI 채점"),
      href: "/topik/writing",
      durationMin: 15,
    });
  }

  if (planDay % 7 === 0 || focus === "mock") {
    tasks.push({
      id: "mock",
      kind: "mock",
      labelVi: l("Thi thử mini TOPIK", "TOPIK 미니 모의고사"),
      labelKo: l("Thi thử mini TOPIK", "TOPIK 미니 모의고사"),
      descVi: l("20 phút · đồng hồ · chấm tự động", "20분 · 타이머 · 자동 채점"),
      descKo: l("20 phút · đồng hồ · chấm tự động", "20분 · 타이머 · 자동 채점"),
      href: `/topik/mock-exam?tier=${tierForLevel(level)}`,
      durationMin: 20,
    });
  }

  if (wrongCount > 0) {
    tasks.push({
      id: "wrong",
      kind: "wrong",
      labelVi: l(`Sửa ${wrongCount} câu sai`, `오답 ${wrongCount}문항`),
      labelKo: l(`Sửa ${wrongCount} câu sai`, `오답 ${wrongCount}문항`),
      descVi: l("Như buổi chữa bài ở học viện", "학원 오답 노트와 동일"),
      descKo: l("Như buổi chữa bài ở học viện", "학원 오답 노트와 동일"),
      href: "/topik/wrong-notes",
      durationMin: 10,
    });
  }

  if (dueCards >= 8) {
    tasks.push({
      id: "review",
      kind: "review",
      labelVi: l(`Ôn SRS (${dueCards} thẻ)`, `SRS 복습 (${dueCards}장)`),
      labelKo: l(`Ôn SRS (${dueCards} thẻ)`, `SRS 복습 (${dueCards}장)`),
      descVi: l("Ôn đúng lúc — nhớ lâu hơn", "적시 반복 — 오래 기억"),
      descKo: l("Ôn đúng lúc — nhớ lâu hơn", "적시 반복 — 오래 기억"),
      href: "/topik/review",
      durationMin: 8,
    });
  }

  let coachVi: string;
  let coachKo: string;
  if (report.probability >= 70) {
    coachVi = `Khả năng đậu ${report.probability}% — duy trì lịch lớp hôm nay là đủ.`;
    coachKo = `합격 가능성 ${report.probability}% — 오늘 수업만 따라가면 됩니다.`;
  } else if (report.daysToExam !== null && report.daysToExam <= 21) {
    coachVi = `Còn ${report.daysToExam} ngày — ưu tiên thi thử + sửa lỗi như lớp luyện thi cấp tốc.`;
    coachKo = `${report.daysToExam}일 남음 — 모의고사 + 오답 우선 (종합반 모드).`;
  } else {
    coachVi =
      "Làm đủ các bước dưới đây ≈ 1 buổi học viện (45–60 phút) — miễn phí, không cần di chuyển.";
    coachKo = "아래 단계 완료 ≈ 학원 1회(45–60분) — 무료, 이동 불필요.";
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
