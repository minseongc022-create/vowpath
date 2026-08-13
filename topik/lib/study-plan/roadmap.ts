import type { StudyPlanDay, TopikLevel } from "@/topik/types";

const FOCUS_ROTATION: StudyPlanDay["focus"][] = [
  "vocab",
  "grammar",
  "reading",
  "listening",
  "speaking",
  "writing",
  "mock",
];

const FOCUS_LABELS: Record<StudyPlanDay["focus"], string> = {
  vocab: "Từ vựng + SRS",
  grammar: "Ngữ pháp",
  reading: "Đọc hiểu",
  listening: "Nghe hiểu",
  speaking: "Nói IBT",
  writing: "Viết TOPIK",
  mock: "Thi thử IBT",
};

export function buildStudyPlan(
  targetLevel: TopikLevel,
  totalDays: 30 | 60 | 90,
): StudyPlanDay[] {
  const days: StudyPlanDay[] = [];

  for (let d = 1; d <= totalDays; d++) {
    const focus = FOCUS_ROTATION[(d - 1) % FOCUS_ROTATION.length]!;
    const week = Math.ceil(d / 7);
    const tasksVi = baseTasks(focus, targetLevel, d, totalDays);

    if (d % 7 === 0) {
      tasksVi.push("Thi thử IBT mini (20 phút) + xem lại sổ sai sót");
    }
    if (d === totalDays) {
      tasksVi.push(`Mục tiêu: sẵn sàng thi TOPIK ${targetLevel}`);
    }

    days.push({
      day: d,
      focus,
      tasksVi,
    });

    void week;
  }

  return days;
}

function baseTasks(
  focus: StudyPlanDay["focus"],
  level: TopikLevel,
  day: number,
  total: number,
): string[] {
  const label = FOCUS_LABELS[focus];
  const intensity = day > total * 0.7 ? "Tăng cường" : "Cơ bản";

  switch (focus) {
    case "vocab":
      return [`${label}: 20 từ TOPIK ${level}`, "Ôn SRS buổi sáng", `${intensity} — flashcard`];
    case "grammar":
      return [`${label}: 2 mẫu câu`, "10 câu trắc nghiệm ngữ pháp", "Ghi chú lỗi vào sổ sai"];
    case "reading":
      return [`${label}: 2 đoạn văn`, "Đọc + tra từ mới", "Thêm 5 từ vào SRS"];
    case "listening":
      return [`${label}: video bài học`, "Nghe và ghi lại 3 câu", "Luyện phát âm theo audio"];
    case "speaking":
      return [`${label}: 1 kịch bản`, "Ghi âm + AI chấm", "Sửa lỗi phát âm người Việt"];
    case "writing":
      return [`${label}: bài 53 hoặc 54`, "Nộp chấm AI", "So sánh với bài mẫu"];
    case "mock":
      return [`${label}: 20 phút`, "Phân tích điểm yếu", "Ôn lại câu sai"];
  }
}

export function getTodayPlan(
  plan: StudyPlanDay[],
  startDateIso: string,
): StudyPlanDay | null {
  const start = new Date(startDateIso);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayIndex = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
  if (dayIndex < 1 || dayIndex > plan.length) return plan[0] ?? null;
  return plan[dayIndex - 1] ?? null;
}
