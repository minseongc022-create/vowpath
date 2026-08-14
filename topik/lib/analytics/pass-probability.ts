import type { PassProbabilityGapLink, PassProbabilityReport, TopikLevel, UserProgress } from "@/topik/types";
import { l } from "@/topik/lib/i18n/locale-text";
import { getDrillRecommendations } from "@/topik/lib/quiz/recommend-drill";

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
  score += Math.min((progress.bestTypingCpm ?? 0) / 4, 8);
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
  const gapLinks: PassProbabilityGapLink[] = [];

  function addGap(text: string, href: string) {
    gapsVi.push(text);
    gapLinks.push({ text, href });
  }

  if (progress.streak >= 3)
    strengthsVi.push(l(`Chuỗi học ${progress.streak} ngày — duy trì tốt!`, `연속 ${progress.streak}일 학습 — 잘하고 있어요!`));
  if (srsRate >= 0.4) strengthsVi.push(l("Từ vựng SRS đã thuộc khá nhiều", "SRS 어휘 많이 암기함"));
  if (progress.writingCount >= 3) strengthsVi.push(l("Đã luyện chấm bài viết nhiều lần", "쓰기 채점 여러 번 연습"));
  if (progress.speakingCount >= 2) strengthsVi.push(l("Đã luyện nói — điểm mạnh so với đối thủ", "말하기 연습 — 경쟁 대비 강점"));
  if ((progress.bestTypingCpm ?? 0) >= 30)
    strengthsVi.push(l("Tốc độ gõ IBT đạt mục tiêu (30+ ký tự/phút)", "IBT 타이핑 목표 달성 (30+타/분)"));

  if (progress.speakingCount < 2)
    addGap(
      l("Luyện nói IBT — kỹ năng yếu nhất của người Việt", "IBT 말하기 — 베트남 학습자 최대 약점"),
      "/topik/speaking",
    );
  if ((progress.bestTypingCpm ?? 0) < 30 && progress.typingCount < 3)
    addGap(
      l("Luyện gõ tiếng Hàn — IBT viết trên màn hình cần 30–40 ký tự/phút", "한국어 타이핑 — IBT 화면 쓰기 30–40타/분"),
      "/topik/typing",
    );
  if (progress.writingCount < 2)
    addGap(l("Chưa đủ bài viết TOPIK 53–54", "TOPIK 53–54번 쓰기 부족"), "/topik/writing");
  if (srsDue > 10)
    addGap(l(`${srsDue} thẻ SRS cần ôn hôm nay`, `오늘 SRS 복습 ${srsDue}장`), "/topik/review");
  if (!progress.bestMockScore)
    addGap(
      l("Chưa làm thi thử IBT — làm ngay để biết điểm thật", "IBT 모의고사 미응시 — 지금 점수 확인"),
      "/topik/mock-exam",
    );
  if (wrongUnresolved > 5)
    addGap(l(`${wrongUnresolved} câu sai chưa thuộc`, `미암기 오답 ${wrongUnresolved}문항`), "/topik/wrong-notes");

  const sectionRecs = getDrillRecommendations(progress.sectionStats ?? {}, 0.65);
  for (const rec of sectionRecs.slice(0, 2)) {
    if (gapLinks.some((g) => g.href === rec.href)) continue;
    addGap(rec.reason, `${rec.href}&level=${progress.targetLevel}`);
  }

  const dailyPlanVi = buildDailyPlan(progress, gapsVi, daysToExam);

  if (probability < threshold) {
    const gapText = l(
      `Cần thêm ~${threshold - probability}% để đạt mục tiêu TOPIK ${progress.targetLevel}`,
      `TOPIK ${progress.targetLevel} 목표까지 ~${threshold - probability}% 더 필요`,
    );
    gapsVi.unshift(gapText);
    gapLinks.unshift({
      text: gapText,
      href: `/topik/drill?type=mixed&level=${progress.targetLevel}`,
    });
  }

  return {
    probability,
    level: progress.targetLevel,
    daysToExam,
    strengthsVi,
    gapsVi,
    gapLinks: gapLinks.slice(0, 6),
    dailyPlanVi,
  };
}

function buildDailyPlan(
  progress: UserProgress,
  gaps: string[],
  daysToExam: number | null,
): string[] {
  const plan: string[] = [l("Ôn SRS 10–15 phút (ưu tiên thẻ đến hạn)", "SRS 10–15분 (복습 카드 우선)")];

  if (progress.speakingCount < 2) {
    plan.push(l("Luyện nói 1 kịch bản IBT (5 phút)", "IBT 말하기 1시나리오 (5분)"));
  } else {
    plan.push(l("Luyện nói 1 kịch bản (duy trì)", "말하기 1시나리오 (유지)"));
  }

  if (progress.writingCount < 5) {
    plan.push(l("Viết và chấm 1 bài TOPIK 53 hoặc 54", "TOPIK 53 또는 54번 쓰기·채점"));
    plan.push(l("Luyện gõ tiếng Hàn 10 phút trước khi viết", "쓰기 전 한국어 타이핑 10분"));
  }

  plan.push(l("Làm 10 câu luyện đề theo cấp mục tiêu", "목표 급수 문제 10문항"));

  if (!progress.bestMockScore || (daysToExam !== null && daysToExam <= 30)) {
    plan.push(l("Thi thử IBT 20 phút (cuối tuần)", "IBT 모의고사 20분 (주말)"));
  }

  plan.push(l("Xem 1 video bài học + thêm từ vào SRS", "레슨 영상 1개 + SRS 단어 추가"));

  return plan.slice(0, 5);
}

export function recommendedStudyDays(daysToExam: number | null): 30 | 60 | 90 {
  if (daysToExam === null || daysToExam > 90) return 90;
  if (daysToExam > 45) return 60;
  return 30;
}
