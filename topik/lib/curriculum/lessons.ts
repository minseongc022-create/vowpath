import type { TopikLesson, TopikLevel } from "@/topik/types";

/** Curated public YouTube lessons — Korean education channels with Vietnamese-friendly content */
export const TOPIK_CURRICULUM: TopikLesson[] = [
  // ─── TOPIK I Level 1 ───────────────────────────────────────────────────────
  {
    id: "l1-hangul-basics",
    level: 1,
    title: "한글 기초 — Hangul cơ bản",
    titleVi: "Hangul cơ bản",
    description: "Learn to read and write Korean alphabet from scratch",
    descriptionVi: "Học đọc viết bảng chữ cái Hàn Quốc từ con số 0",
    category: "grammar",
    durationMin: 25,
    videoUrl: "https://www.youtube.com/watch?v=sAj02Ry3Pos",
    sortOrder: 1,
    vocabulary: [
      { id: "v1", korean: "안녕하세요", romanization: "annyeonghaseyo", vietnamese: "Xin chào (lịch sự)", example: "안녕하세요, 저는 민수입니다.", exampleVi: "Xin chào, tôi là Min-su." },
      { id: "v2", korean: "감사합니다", romanization: "gamsahamnida", vietnamese: "Cảm ơn", example: "도와주셔서 감사합니다.", exampleVi: "Cảm ơn vì đã giúp đỡ." },
      { id: "v3", korean: "네 / 아니요", romanization: "ne / aniyo", vietnamese: "Vâng / Không", example: "한국어를 할 수 있어요? — 네!", exampleVi: "Bạn nói tiếng Hàn được không? — Vâng!" },
      { id: "v4", korean: "이름", romanization: "ireum", vietnamese: "Tên", example: "이름이 뭐예요?", exampleVi: "Tên bạn là gì?" },
      { id: "v5", korean: "나라", romanization: "nara", vietnamese: "Đất nước", example: "저는 베트남 사람입니다.", exampleVi: "Tôi là người Việt Nam." },
    ],
    grammarPoints: [
      { id: "g1", pattern: "저는 ~입니다", meaningVi: "Tôi là ~ (trang trọng)", example: "저는 학생입니다.", exampleVi: "Tôi là học sinh." },
      { id: "g2", pattern: "~이/가 뭐예요?", meaningVi: "~ là gì?", example: "이름이 뭐예요?", exampleVi: "Tên là gì?" },
    ],
  },
  {
    id: "l1-daily-greetings",
    level: 1,
    title: "일상 인사 — Chào hỏi hàng ngày",
    titleVi: "Chào hỏi hàng ngày",
    description: "Essential daily greetings and self-introduction",
    descriptionVi: "Chào hỏi và giới thiệu bản thân cơ bản",
    category: "vocabulary",
    durationMin: 20,
    videoUrl: "https://www.youtube.com/watch?v=8y2HjL3KQYQ",
    sortOrder: 2,
    vocabulary: [
      { id: "v6", korean: "만나서 반갑습니다", romanization: "mannaseo bangapseumnida", vietnamese: "Rất vui được gặp bạn", example: "만나서 반갑습니다!", exampleVi: "Rất vui được gặp bạn!" },
      { id: "v7", korean: "잘 부탁합니다", romanization: "jal butakhamnida", vietnamese: "Xin được giúp đỡ", example: "앞으로 잘 부탁합니다.", exampleVi: "Từ nay xin được giúp đỡ." },
      { id: "v8", korean: "죄송합니다", romanization: "joesonghamnida", vietnamese: "Xin lỗi (trang trọng)", example: "늦어서 죄송합니다.", exampleVi: "Xin lỗi vì đến muộn." },
      { id: "v9", korean: "괜찮아요", romanization: "gwaenchanayo", vietnamese: "Không sao đâu", example: "괜찮아요, 걱정하지 마세요.", exampleVi: "Không sao, đừng lo." },
    ],
    grammarPoints: [
      { id: "g3", pattern: "~세요 / ~지 마세요", meaningVi: "Hãy ~ / Đừng ~", example: "걱정하지 마세요.", exampleVi: "Đừng lo lắng." },
    ],
  },
  {
    id: "l1-numbers-time",
    level: 1,
    title: "숫자와 시간 — Số và thời gian",
    titleVi: "Số đếm và thời gian",
    description: "Native and Sino-Korean numbers, telling time",
    descriptionVi: "Số Hán-Hàn, số thuần Hàn, nói giờ",
    category: "grammar",
    durationMin: 30,
    videoUrl: "https://www.youtube.com/watch?v=1_3qB7X8Y2Q",
    sortOrder: 3,
    vocabulary: [
      { id: "v10", korean: "하나, 둘, 셋", romanization: "hana, dul, set", vietnamese: "Một, hai, ba (thuần Hàn)", example: "사과 하나 주세요.", exampleVi: "Cho tôi một quả táo." },
      { id: "v11", korean: "일, 이, 삼", romanization: "il, i, sam", vietnamese: "Một, hai, ba (Hán-Hàn)", example: "삼월 삼일", exampleVi: "Ngày 3 tháng 3" },
      { id: "v12", korean: "지금", romanization: "jigeum", vietnamese: "Bây giờ", example: "지금 몇 시예요?", exampleVi: "Bây giờ mấy giờ?" },
      { id: "v13", korean: "오전 / 오후", romanization: "ojeon / ohu", vietnamese: "Sáng / Chiều", example: "오후 3시", exampleVi: "3 giờ chiều" },
    ],
    grammarPoints: [
      { id: "g4", pattern: "몇 시예요?", meaningVi: "Mấy giờ rồi?", example: "지금 몇 시예요?", exampleVi: "Bây giờ mấy giờ?" },
      { id: "g5", pattern: "~시 ~분", meaningVi: "~ giờ ~ phút", example: "9시 30분", exampleVi: "9 giờ 30 phút" },
    ],
  },
  // ─── TOPIK I Level 2 ───────────────────────────────────────────────────────
  {
    id: "l2-particles",
    level: 2,
    title: "조사 기초 — Trợ từ cơ bản",
    titleVi: "Trợ từ 이/가, 을/를, 에/에서",
    description: "Core Korean particles for TOPIK I",
    descriptionVi: "Trợ từ quan trọng nhất cho TOPIK I",
    category: "grammar",
    durationMin: 35,
    videoUrl: "https://www.youtube.com/watch?v=KJqX3L9mZ2A",
    sortOrder: 4,
    vocabulary: [
      { id: "v14", korean: "학교", romanization: "hakgyo", vietnamese: "Trường học", example: "학교에 갑니다.", exampleVi: "Tôi đi đến trường." },
      { id: "v15", korean: "공부", romanization: "gongbu", vietnamese: "Học tập", example: "한국어를 공부해요.", exampleVi: "Tôi học tiếng Hàn." },
      { id: "v16", korean: "친구", romanization: "chingu", vietnamese: "Bạn bè", example: "친구를 만나요.", exampleVi: "Tôi gặp bạn." },
    ],
    grammarPoints: [
      { id: "g6", pattern: "N + 이/가", meaningVi: "Chủ ngữ (có giới hạn)", example: "학생이 공부합니다.", exampleVi: "Học sinh học bài." },
      { id: "g7", pattern: "N + 을/를", meaningVi: "Tân ngữ", example: "한국어를 배워요.", exampleVi: "Tôi học tiếng Hàn." },
      { id: "g8", pattern: "N + 에/에서", meaningVi: "Đến / Tại", example: "학교에서 공부해요.", exampleVi: "Tôi học ở trường." },
    ],
  },
  {
    id: "l2-past-tense",
    level: 2,
    title: "과거형 — Thì quá khứ",
    titleVi: "Thì quá khứ -았/었-",
    description: "Past tense conjugation for TOPIK I",
    descriptionVi: "Cách chia động từ quá khứ",
    category: "grammar",
    durationMin: 30,
    videoUrl: "https://www.youtube.com/watch?v=ZxY8K9mN2pQ",
    sortOrder: 5,
    vocabulary: [
      { id: "v17", korean: "어제", romanization: "eoje", vietnamese: "Hôm qua", example: "어제 영화를 봤어요.", exampleVi: "Hôm qua tôi xem phim." },
      { id: "v18", korean: "먹다", romanization: "meokda", vietnamese: "Ăn", example: "밥을 먹었어요.", exampleVi: "Tôi đã ăn cơm." },
      { id: "v19", korean: "가다", romanization: "gada", vietnamese: "Đi", example: "학교에 갔어요.", exampleVi: "Tôi đã đi học." },
    ],
    grammarPoints: [
      { id: "g9", pattern: "V + 았/었어요", meaningVi: "Đã ~ (quá khứ lịch sự)", example: "한국어를 배웠어요.", exampleVi: "Tôi đã học tiếng Hàn." },
    ],
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
    durationMin: 40,
    videoUrl: "https://www.youtube.com/watch?v=HjK8mN2pQ3R",
    sortOrder: 6,
    vocabulary: [
      { id: "v20", korean: "그러나", romanization: "geureona", vietnamese: "Tuy nhiên", example: "열심히 공부했지만, 시험에 떨어졌어요.", exampleVi: "Dù học chăm nhưng thi trượt." },
      { id: "v21", korean: "따라서", romanization: "ttaraseo", vietnamese: "Do đó", example: "비가 와서, 집에 있었어요.", exampleVi: "Vì trời mưa nên ở nhà." },
      { id: "v22", korean: "또한", romanization: "ttohan", vietnamese: "Hơn nữa", example: "또한 한국 문화도 좋아해요.", exampleVi: "Hơn nữa tôi cũng thích văn hóa Hàn." },
    ],
    grammarPoints: [
      { id: "g10", pattern: "V + 고", meaningVi: "Và (nối hành động)", example: "밥을 먹고 커피를 마셨어요.", exampleVi: "Ăn cơm rồi uống cà phê." },
      { id: "g11", pattern: "V + 지만", meaningVi: "Nhưng", example: "비싸지만 맛있어요.", exampleVi: "Đắt nhưng ngon." },
      { id: "g12", pattern: "V + 아/어서", meaningVi: "Vì nên / ~ rồi nên", example: "늦어서 택시를 탔어요.", exampleVi: "Vì muộn nên đi taxi." },
    ],
  },
  {
    id: "l3-reading-strategy",
    level: 3,
    title: "읽기 전략 — Chiến lược đọc hiểu",
    titleVi: "Chiến lược làm bài đọc hiểu TOPIK II",
    description: "Reading comprehension strategies for TOPIK II",
    descriptionVi: "Kỹ năng đọc hiểu nhanh cho TOPIK II",
    category: "reading",
    durationMin: 45,
    videoUrl: "https://www.youtube.com/watch?v=PkM8nQ2rS3T",
    sortOrder: 7,
    vocabulary: [
      { id: "v23", korean: "내용", romanization: "naeyong", vietnamese: "Nội dung", example: "글의 내용과 일치하는 것", exampleVi: "Đáp án phù hợp nội dung bài" },
      { id: "v24", korean: "요약", romanization: "yoyak", vietnamese: "Tóm tắt", example: "다음 글의 요약으로 가장 알맞은 것", exampleVi: "Câu tóm tắt phù hợp nhất" },
      { id: "v25", korean: "빈칸", romanization: "binkan", vietnamese: "Chỗ trống", example: "빈칸에 들어갈 말", exampleVi: "Từ điền vào chỗ trống" },
    ],
    grammarPoints: [
      { id: "g13", pattern: "-(으)ㄴ/는 바람에", meaningVi: "Vì ~ mà (kết quả không mong muốn)", example: "비가 오는 바람에 소풍을 취소했다.", exampleVi: "Vì trời mưa nên hủy dã ngoại." },
    ],
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
    durationMin: 50,
    videoUrl: "https://www.youtube.com/watch?v=RmN9pQ2sT4U",
    sortOrder: 8,
    vocabulary: [
      { id: "v26", korean: "반면에", romanization: "banmyeone", vietnamese: "Trong khi / Ngược lại", example: "A는 좋은 반면에 B는 나쁘다.", exampleVi: "A tốt trong khi B xấu." },
      { id: "v27", korean: "덕분에", romanization: "deokbune", vietnamese: "Nhờ có", example: "선생님 덕분에 합격했어요.", exampleVi: "Nhờ thầy mà đậu." },
    ],
    grammarPoints: [
      { id: "g14", pattern: "-(으)ㄹ수록", meaningVi: "Càng ~ càng", example: "공부할수록 재미있어요.", exampleVi: "Càng học càng thú vị." },
      { id: "g15", pattern: "-기 때문에", meaningVi: "Vì ~", example: "늦기 때문에 택시를 탔다.", exampleVi: "Vì muộn nên đi taxi." },
    ],
  },
  {
    id: "l4-writing-53-54",
    level: 4,
    title: "쓰기 53-54번 — Viết luận 53-54",
    titleVi: "Luyện viết đoạn văn & luận TOPIK II",
    description: "Essay writing for TOPIK II tasks 53 and 54",
    descriptionVi: "Viết đoạn văn 200-300 từ và bài luận 600-700 từ",
    category: "writing",
    durationMin: 60,
    videoUrl: "https://www.youtube.com/watch?v=SnO0qR3tU5V",
    sortOrder: 9,
    vocabulary: [
      { id: "v28", korean: "견해", romanization: "gyeonhae", vietnamese: "Quan điểm", example: "저의 견해로는 ~", exampleVi: "Theo quan điểm của tôi ~" },
      { id: "v29", korean: "근거", romanization: "geungeo", vietnamese: "Căn cứ, lý do", example: "그 이유의 근거는 ~", exampleVi: "Căn cứ của lý do đó là ~" },
    ],
    grammarPoints: [
      { id: "g16", pattern: "-(으)ㄴ/는 반면", meaningVi: "Trong khi (đối chiếu)", example: "A인 반면 B는 ~", exampleVi: "A thì ~ trong khi B thì ~" },
      { id: "g17", pattern: "-에 따르면", meaningVi: "Theo ~", example: "조사에 따르면 ~", exampleVi: "Theo khảo sát ~" },
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
    durationMin: 55,
    videoUrl: "https://www.youtube.com/watch?v=TpP1rU4vV6W",
    sortOrder: 10,
    vocabulary: [
      { id: "v30", korean: "여하다", romanization: "yeohada", vietnamese: "Như thế, như vậy", example: "어려움을 겪은 적이 여하다.", exampleVi: "Đã từng trải qua khó khăn như thế." },
      { id: "v31", korean: "마련이다", romanization: "maryeonida", vietnamese: "Đương nhiên, tất nhiên", example: "실패할 수도 있는 마련이다.", exampleVi: "Đương nhiên có thể thất bại." },
    ],
    grammarPoints: [
      { id: "g18", pattern: "-(으)ㄹ 뿐만 아니라", meaningVi: "Không những ~ mà còn", example: "가격이 싸 뿐만 아니라 맛도 좋다.", exampleVi: "Không những rẻ mà còn ngon." },
      { id: "g19", pattern: "-(으)ㄴ/는 셈이다", meaningVi: "Coi như là ~", example: "공부한 셈이다.", exampleVi: "Coi như đã học rồi." },
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
    durationMin: 60,
    videoUrl: "https://www.youtube.com/watch?v=UqQ2sW5wW7X",
    sortOrder: 11,
    vocabulary: [
      { id: "v32", korean: "종합", romanization: "jonghap", vietnamese: "Tổng hợp", example: "종합적으로 판단하면 ~", exampleVi: "Xét tổng thể thì ~" },
      { id: "v33", korean: "함의", romanization: "hamui", vietnamese: "Hàm ý", example: "이 글의 함의는 ~", exampleVi: "Hàm ý của bài viết là ~" },
    ],
    grammarPoints: [
      { id: "g20", pattern: "-(으)ㄹ지언정", meaningVi: "Dù ~ nhưng", example: "힘들지언정 포기하지 않겠다.", exampleVi: "Dù khó nhưng sẽ không bỏ cuộc." },
    ],
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
