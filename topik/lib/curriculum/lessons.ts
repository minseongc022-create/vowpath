import type { TopikLesson, TopikLevel } from "@/topik/types";

/**
 * Curated public YouTube lessons — link/embed only (no re-upload).
 * Channels: Talk To Me In Korean, GO! Billy Korean, Seemile Korean.
 */
export const TOPIK_CURRICULUM: TopikLesson[] = [
  // ─── TOPIK I Level 1 ───────────────────────────────────────────────────────
  {
    id: "l1-hangul-basics",
    level: 1,
    title: "한글 기초 — Hangul cơ bản",
    titleVi: "Hangul cơ bản (TTMIK)",
    description: "Learn to read and write Korean alphabet from scratch",
    descriptionVi: "Học đọc viết bảng chữ cái Hàn Quốc từ con số 0",
    category: "grammar",
    durationMin: 35,
    videoUrl: "https://www.youtube.com/watch?v=sAj02Ry3Pos",
    channelName: "Talk To Me In Korean",
    sortOrder: 1,
    vocabulary: [
      { id: "v1", korean: "안녕하세요", romanization: "annyeonghaseyo", vietnamese: "Xin chào (lịch sự)", example: "안녕하세요, 저는 민수입니다.", exampleVi: "Xin chào, tôi là Min-su." },
      { id: "v2", korean: "감사합니다", romanization: "gamsahamnida", vietnamese: "Cảm ơn", example: "도와주셔서 감사합니다.", exampleVi: "Cảm ơn vì đã giúp đỡ." },
      { id: "v3", korean: "네 / 아니요", romanization: "ne / aniyo", vietnamese: "Vâng / Không", example: "한국어를 할 수 있어요? — 네!", exampleVi: "Bạn nói tiếng Hàn được không? — Vâng!" },
    ],
    grammarPoints: [
      { id: "g1", pattern: "저는 ~입니다", meaningVi: "Tôi là ~ (trang trọng)", example: "저는 학생입니다.", exampleVi: "Tôi là học sinh." },
    ],
  },
  {
    id: "l1-ttmik-l1",
    level: 1,
    title: "TTMIK Level 1 Lesson 1",
    titleVi: "TTMIK Bài 1 — Chào hỏi",
    description: "First TTMIK lesson — greetings and basics",
    descriptionVi: "Bài học đầu tiên TTMIK — chào hỏi cơ bản",
    category: "vocabulary",
    durationMin: 15,
    videoUrl: "https://www.youtube.com/watch?v=CdZM4qHkbwo",
    channelName: "Talk To Me In Korean",
    sortOrder: 2,
    vocabulary: [
      { id: "v4", korean: "이름", romanization: "ireum", vietnamese: "Tên", example: "이름이 뭐예요?", exampleVi: "Tên bạn là gì?" },
      { id: "v5", korean: "나라", romanization: "nara", vietnamese: "Đất nước", example: "저는 베트남 사람입니다.", exampleVi: "Tôi là người Việt Nam." },
    ],
    grammarPoints: [
      { id: "g2", pattern: "~이/가 뭐예요?", meaningVi: "~ là gì?", example: "이름이 뭐예요?", exampleVi: "Tên là gì?" },
    ],
  },
  {
    id: "l1-billy-intro",
    level: 1,
    title: "Billy Korean — Khóa học cơ bản",
    titleVi: "Billy Korean — Giới thiệu khóa học",
    description: "Complete beginner course introduction",
    descriptionVi: "Giới thiệu khóa học tiếng Hàn cho người mới",
    category: "grammar",
    durationMin: 10,
    videoUrl: "https://www.youtube.com/watch?v=sx0yyQqkpqo",
    channelName: "GO! Billy Korean",
    sortOrder: 3,
    vocabulary: [
      { id: "v6", korean: "만나서 반갑습니다", romanization: "mannaseo bangapseumnida", vietnamese: "Rất vui được gặp bạn", example: "만나서 반갑습니다!", exampleVi: "Rất vui được gặp bạn!" },
    ],
    grammarPoints: [
      { id: "g3", pattern: "~세요 / ~지 마세요", meaningVi: "Hãy ~ / Đừng ~", example: "걱정하지 마세요.", exampleVi: "Đừng lo lắng." },
    ],
  },

  // ─── TOPIK I Level 2 ───────────────────────────────────────────────────────
  {
    id: "l2-particles",
    level: 2,
    title: "조사 — Trợ từ 이/가, 을/를",
    titleVi: "Trợ từ cơ bản (TTMIK)",
    description: "Core Korean particles for TOPIK I",
    descriptionVi: "Trợ từ quan trọng nhất cho TOPIK I",
    category: "grammar",
    durationMin: 12,
    videoUrl: "https://www.youtube.com/watch?v=fCxLNrlEG7I",
    channelName: "Talk To Me In Korean",
    sortOrder: 4,
    vocabulary: [
      { id: "v14", korean: "학교", romanization: "hakgyo", vietnamese: "Trường học", example: "학교에 갑니다.", exampleVi: "Tôi đi đến trường." },
      { id: "v15", korean: "공부", romanization: "gongbu", vietnamese: "Học tập", example: "한국어를 공부해요.", exampleVi: "Tôi học tiếng Hàn." },
    ],
    grammarPoints: [
      { id: "g6", pattern: "N + 이/가", meaningVi: "Chủ ngữ (có giới hạn)", example: "학생이 공부합니다.", exampleVi: "Học sinh học bài." },
      { id: "g7", pattern: "N + 을/를", meaningVi: "Tân ngữ", example: "한국어를 배워요.", exampleVi: "Tôi học tiếng Hàn." },
    ],
  },
  {
    id: "l2-past-tense",
    level: 2,
    title: "과거형 — Thì quá khứ",
    titleVi: "Thì quá khứ -았/었- (TTMIK)",
    description: "Past tense conjugation for TOPIK I",
    descriptionVi: "Cách chia động từ quá khứ",
    category: "grammar",
    durationMin: 10,
    videoUrl: "https://www.youtube.com/watch?v=FQP3_k0GEe4",
    channelName: "Talk To Me In Korean",
    sortOrder: 5,
    vocabulary: [
      { id: "v17", korean: "어제", romanization: "eoje", vietnamese: "Hôm qua", example: "어제 영화를 봤어요.", exampleVi: "Hôm qua tôi xem phim." },
      { id: "v18", korean: "먹다", romanization: "meokda", vietnamese: "Ăn", example: "밥을 먹었어요.", exampleVi: "Tôi đã ăn cơm." },
    ],
    grammarPoints: [
      { id: "g9", pattern: "V + 았/었어요", meaningVi: "Đã ~ (quá khứ lịch sự)", example: "한국어를 배웠어요.", exampleVi: "Tôi đã học tiếng Hàn." },
    ],
  },
  {
    id: "l2-listening-billy",
    level: 2,
    title: "Listening Practice — Nghe cơ bản",
    titleVi: "Luyện nghe TOPIK (Billy Korean)",
    description: "Beginner listening practice for Korean tests",
    descriptionVi: "Luyện nghe cơ bản cho kỳ thi tiếng Hàn",
    category: "listening",
    durationMin: 15,
    videoUrl: "https://www.youtube.com/watch?v=7l5USF8O5eo",
    channelName: "GO! Billy Korean",
    sortOrder: 6,
    vocabulary: [
      { id: "v19", korean: "듣기", romanization: "deutgi", vietnamese: "Nghe", example: "듣기 연습을 해요.", exampleVi: "Tôi luyện nghe." },
    ],
    grammarPoints: [],
  },

  // ─── TOPIK II Level 3 ──────────────────────────────────────────────────────
  {
    id: "l3-connectives",
    level: 3,
    title: "연결어미 — Liên từ nối câu",
    titleVi: "Liên từ -고, -지만, -아/어서",
    description: "Sentence connectors essential for TOPIK II reading",
    descriptionVi: "Liên từ nối câu quan trọng cho TOPIK II",
    category: "grammar",
    durationMin: 18,
    videoUrl: "https://www.youtube.com/watch?v=0p8NWKsZ_3c",
    channelName: "Talk To Me In Korean",
    sortOrder: 7,
    vocabulary: [
      { id: "v20", korean: "그러나", romanization: "geureona", vietnamese: "Tuy nhiên", example: "열심히 공부했지만, 시험에 떨어졌어요.", exampleVi: "Dù học chăm nhưng thi trượt." },
      { id: "v21", korean: "따라서", romanization: "ttaraseo", vietnamese: "Do đó", example: "비가 와서, 집에 있었어요.", exampleVi: "Vì trời mưa nên ở nhà." },
    ],
    grammarPoints: [
      { id: "g10", pattern: "V + 고", meaningVi: "Và (nối hành động)", example: "밥을 먹고 커피를 마셨어요.", exampleVi: "Ăn cơm rồi uống cà phê." },
      { id: "g11", pattern: "V + 지만", meaningVi: "Nhưng", example: "비싸지만 맛있어요.", exampleVi: "Đắt nhưng ngon." },
    ],
  },
  {
    id: "l3-topik-prep",
    level: 3,
    title: "TOPIK 준비 — Chuẩn bị TOPIK",
    titleVi: "Chuẩn bị thi TOPIK (Seemile)",
    description: "TOPIK exam preparation overview",
    descriptionVi: "Tổng quan luyện thi TOPIK",
    category: "reading",
    durationMin: 20,
    videoUrl: "https://www.youtube.com/watch?v=pkh3YFCAMYo",
    channelName: "Seemile Korean",
    sortOrder: 8,
    vocabulary: [
      { id: "v23", korean: "시험", romanization: "siheom", vietnamese: "Kỳ thi", example: "TOPIK 시험을 봅니다.", exampleVi: "Thi TOPIK." },
      { id: "v24", korean: "합격", romanization: "hapgyeok", vietnamese: "Đậu", example: "시험에 합격했어요.", exampleVi: "Đã đậu kỳ thi." },
    ],
    grammarPoints: [],
  },

  // ─── TOPIK II Level 4 ──────────────────────────────────────────────────────
  {
    id: "l4-writing-51-52",
    level: 4,
    title: "쓰기 51-52번 — Viết câu 51-52",
    titleVi: "Luyện viết câu 51-52 TOPIK II",
    description: "Practice TOPIK II writing tasks 51 and 52",
    descriptionVi: "Luyện điền từ và viết câu hoàn chỉnh",
    category: "writing",
    durationMin: 25,
    videoUrl: "https://www.youtube.com/watch?v=RmN9pQ2sT4U",
    channelName: "Seemile Korean",
    sortOrder: 9,
    vocabulary: [
      { id: "v26", korean: "반면에", romanization: "banmyeone", vietnamese: "Trong khi / Ngược lại", example: "A는 좋은 반면에 B는 나쁘다.", exampleVi: "A tốt trong khi B xấu." },
    ],
    grammarPoints: [
      { id: "g14", pattern: "-(으)ㄹ수록", meaningVi: "Càng ~ càng", example: "공부할수록 재미있어요.", exampleVi: "Càng học càng thú vị." },
    ],
  },
  {
    id: "l4-ibt-writing",
    level: 4,
    title: "IBT 쓰기 — Viết trên màn hình",
    titleVi: "IBT viết trên màn hình + luyện gõ",
    description: "IBT writing on screen — typing speed tips",
    descriptionVi: "Viết IBT trên màn hình — mẹo tốc độ gõ 30–40 ký tự/phút",
    category: "writing",
    durationMin: 15,
    videoUrl: "https://www.youtube.com/watch?v=SnO0qR3tU5V",
    channelName: "Seemile Korean",
    sortOrder: 10,
    vocabulary: [
      { id: "v28", korean: "견해", romanization: "gyeonhae", vietnamese: "Quan điểm", example: "저의 견해로는 ~", exampleVi: "Theo quan điểm của tôi ~" },
    ],
    grammarPoints: [
      { id: "g16", pattern: "첫째, 둘째, 셋째", meaningVi: "Thứ nhất, thứ hai, thứ ba", example: "첫째, ~ 둘째, ~", exampleVi: "Liệt kê lý luận IBT Q53." },
    ],
  },

  // ─── TOPIK II Level 5-6 ────────────────────────────────────────────────────
  {
    id: "l5-advanced-grammar",
    level: 5,
    title: "고급 문법 — Ngữ pháp nâng cao",
    titleVi: "Ngữ pháp TOPIK 5-6",
    description: "Advanced grammar patterns for high TOPIK scores",
    descriptionVi: "Mẫu ngữ pháp nâng cao cho TOPIK 5-6",
    category: "grammar",
    durationMin: 22,
    videoUrl: "https://www.youtube.com/watch?v=TpP1rU4vV6W",
    channelName: "Talk To Me In Korean",
    sortOrder: 11,
    vocabulary: [
      { id: "v30", korean: "마련이다", romanization: "maryeonida", vietnamese: "Đương nhiên", example: "실패할 수도 있는 마련이다.", exampleVi: "Đương nhiên có thể thất bại." },
    ],
    grammarPoints: [
      { id: "g18", pattern: "-(으)ㄹ 뿐만 아니라", meaningVi: "Không những ~ mà còn", example: "가격이 싸 뿐만 아니라 맛도 좋다.", exampleVi: "Không những rẻ mà còn ngon." },
    ],
  },
  {
    id: "l6-topik-strategy",
    level: 6,
    title: "TOPIK 6급 전략 — Chiến lược TOPIK 6",
    titleVi: "Chiến lược đạt TOPIK 6",
    description: "Final preparation strategy for TOPIK level 6",
    descriptionVi: "Chiến lược tổng ôn và thi TOPIK 6",
    category: "reading",
    durationMin: 30,
    videoUrl: "https://www.youtube.com/watch?v=UqQ2sW5wW7X",
    channelName: "Seemile Korean",
    sortOrder: 12,
    vocabulary: [
      { id: "v32", korean: "종합", romanization: "jonghap", vietnamese: "Tổng hợp", example: "종합적으로 판단하면 ~", exampleVi: "Xét tổng thể thì ~" },
    ],
    grammarPoints: [
      { id: "g20", pattern: "-(으)ㄹ지언정", meaningVi: "Dù ~ nhưng", example: "힘들지언정 포기하지 않겠다.", exampleVi: "Dù khó nhưng sẽ không bỏ cuộc." },
    ],
  },
  {
    id: "l5-ibt-speaking",
    level: 5,
    title: "IBT 말하기 — Luyện nói IBT",
    titleVi: "Luyện nói TOPIK IBT (6 dạng)",
    description: "TOPIK IBT speaking practice overview",
    descriptionVi: "Tổng quan 6 dạng bài nói IBT",
    category: "listening",
    durationMin: 18,
    videoUrl: "https://www.youtube.com/watch?v=HjK8mN2pQ3R",
    channelName: "Seemile Korean",
    sortOrder: 13,
    vocabulary: [
      { id: "v33", korean: "발표", romanization: "balpyo", vietnamese: "Thuyết trình", example: "1분 동안 발표하세요.", exampleVi: "Thuyết trình trong 1 phút." },
    ],
    grammarPoints: [],
  },
];

export function getLessonsByLevel(level: TopikLevel): TopikLesson[] {
  return TOPIK_CURRICULUM.filter((l) => l.level === level).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getLessonById(id: string): TopikLesson | undefined {
  return TOPIK_CURRICULUM.find((l) => l.id === id);
}

export function getAllLevels(): TopikLevel[] {
  return [1, 2, 3, 4, 5, 6];
}

export function levelLabel(level: TopikLevel): string {
  return `TOPIK ${level}`;
}

export function tierForLevel(level: TopikLevel): "topik-i" | "topik-ii" {
  return level <= 2 ? "topik-i" : "topik-ii";
}

export function getCuratedVideoCount(): number {
  return TOPIK_CURRICULUM.filter((l) => l.videoUrl).length;
}
