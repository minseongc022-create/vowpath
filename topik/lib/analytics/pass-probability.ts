import type { PassProbabilityReport, TopikLevel, UserProgress } from "@/topik/types";

type AnalyticsInput = {
  progress: UserProgress;
  srsTotal: number;
  srsMastered: number;
  srsDue: number;
  wrongUnresolved: number;
  lessonTotal: number;
};

const LEVEL_THRESHOLDS: Record<TopikLevel, number> = {
  1: 45,
  2: 55,
  3: 65,
  4: 72,
  5: 78,
  6: 85,
};

export function computePassProbability(input: AnalyticsInput): PassProbabilityReport {
  const { progress, srsTotal, srsMastered, srsDue, wrongUnresolved, lessonTotal } = input;
  const threshold = LEVEL_THRESHOLDS[progress.targetLevel];

  const srsRate = srsTotal > 0 ? srsMastered / srsTotal : 0;
  const lessonCompleted = Object.values(progress.lessons).filter((l) => l.completed).length;
  const lessonRate = lessonTotal > 0 ? lessonCompleted / lessonTotal : 0;

  let score = 15;
  score += srsRate * 30;
  score += lessonRate * 15;
  score += Math.min(progress.writingCount * 2.5, 12);
  score += Math.min(progress.speakingCount * 2, 10);
  score += Math.min(progress.streak * 1.5, 9);
  score += Math.min((progress.bestMockScore ?? 0) / 10, 12);
  score += Math.min(progress.reviewSessions, 8);
  score -= wrongUnresolved * 2;
  score -= srsDue > 20 ? 5 : 0;

  const probability = Math.max(5, Math.min(95, Math.round(score)));

  const daysToExam = progress.examDate
    ? Math.max(0, Math.ceil((new Date(progress.examDate).getTime() - Date.now()) / 86_400_000))
    : null;

  const strengthsVi: string[] = [];
  const gapsVi: string[] = [];

  if (progress.streak >= 3) strengthsVi.push(`Chuỗi học ${progress.streak} ngày — duy trì tốt!`);
  if (srsRate >= 0.4) strengthsVi.push("Từ vựng SRS đã thuộc khá nhiều");
  if (progress.writingCount >= 3) strengthsVi.push("Đã luyện chấm bài viết nhiều lần");
  if (progress.speakingCount >= 2) strengthsVi.push("Đã luyện nói — điểm mạnh so với đối thủ");

  if (progress.speakingCount < 2) gapsVi.push("Luyện nói IBT — kỹ năng yếu nhất của người Việt");
  if (progress.writingCount < 2) gapsVi.push("Chưa đủ bài viết TOPIK 53–54");
  if (srsDue > 10) gapsVi.push(`${srsDue} thẻ SRS cần ôn hôm nay`);
  if (!progress.bestMockScore) gapsVi.push("Chưa làm thi thử IBT — làm ngay để biết điểm thật");
  if (wrongUnresolved > 5) gapsVi.push(`${wrongUnresolved} câu sai chưa thuộc`);

  const dailyPlanVi = buildDailyPlan(progress, gapsVi, daysToExam);

  if (probability < threshold) {
    gapsVi.unshift(
      `Cần thêm ~${threshold - probability}% để đạt mục tiêu TOPIK ${progress.targetLevel}`,
    );
  }

  return {
    probability,
    level: progress.targetLevel,
    daysToExam,
    strengthsVi,
    gapsVi,
    dailyPlanVi,
  };
}

function buildDailyPlan(
  progress: UserProgress,
  gaps: string[],
  daysToExam: number | null,
): string[] {
  const plan: string[] = ["Ôn SRS 10–15 phút (ưu tiên thẻ đến hạn)"];

  if (gaps.some((g) => g.includes("nói"))) {
    plan.push("Luyện nói 1 kịch bản IBT (5 phút)");
  } else {
    plan.push("Luyện nói 1 kịch bản (duy trì)");
  }

  if (progress.writingCount < 5) {
    plan.push("Viết và chấm 1 bài TOPIK 53 hoặc 54");
  }

  plan.push("Làm 10 câu luyện đề theo cấp mục tiêu");

  if (!progress.bestMockScore || (daysToExam !== null && daysToExam <= 30)) {
    plan.push("Thi thử IBT 20 phút (cuối tuần)");
  }

  plan.push("Xem 1 video bài học + thêm từ vào SRS");

  return plan.slice(0, 5);
}

export function recommendedStudyDays(daysToExam: number | null): 30 | 60 | 90 {
  if (daysToExam === null || daysToExam > 90) return 90;
  if (daysToExam > 45) return 60;
  return 30;
}
