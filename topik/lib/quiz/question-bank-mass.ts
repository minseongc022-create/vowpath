import type { TopikLevel, TopikQuizQuestion } from "@/topik/types";

type ListeningSeed = {
  script: string;
  scriptVi: string;
  question: string;
  questionVi: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanationVi: string;
};

type ReadingSeed = {
  passage: string;
  question: string;
  questionVi: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanationVi: string;
};

function listening(level: TopikLevel, n: number, s: ListeningSeed): TopikQuizQuestion {
  return {
    id: `mass-l${level}-l-${String(n).padStart(2, "0")}`,
    level,
    type: "multiple_choice",
    category: "listening",
    examSection: "listening",
    question: s.question,
    questionVi: s.questionVi,
    options: [...s.options],
    correctIndex: s.correctIndex,
    explanation: s.explanationVi,
    explanationVi: s.explanationVi,
    listeningScript: s.script,
    listeningScriptVi: s.scriptVi,
  };
}

function reading(level: TopikLevel, n: number, s: ReadingSeed): TopikQuizQuestion {
  return {
    id: `mass-l${level}-r-${String(n).padStart(2, "0")}`,
    level,
    type: "multiple_choice",
    category: "reading",
    examSection: "reading",
    question: s.question,
    questionVi: s.questionVi,
    passage: s.passage,
    options: [...s.options],
    correctIndex: s.correctIndex,
    explanation: s.explanationVi,
    explanationVi: s.explanationVi,
  };
}

const LEVEL_1_BANK: TopikQuizQuestion[] = [
  listening(1, 1, { script: "아침에 학교에 가요.", scriptVi: "Buổi sáng tôi đi học.", question: "어디에 갑니까?", questionVi: "Đi đâu?", options: ["학교", "병원", "회사", "공원"], correctIndex: 0, explanationVi: "Đi học." }),
  listening(1, 2, { script: "점심에 밥을 먹어요.", scriptVi: "Trưa ăn cơm.", question: "무엇을 먹습니까?", questionVi: "Ăn gì?", options: ["밥", "빵", "과일", "국"], correctIndex: 0, explanationVi: "Ăn cơm." }),
  listening(1, 3, { script: "저는 학생입니다.", scriptVi: "Tôi là học sinh.", question: "직업은 무엇입니까?", questionVi: "Nghề nghiệp?", options: ["학생", "의사", "기자", "요리사"], correctIndex: 0, explanationVi: "Học sinh." }),
  listening(1, 4, { script: "오늘은 월요일입니다.", scriptVi: "Hôm nay là thứ Hai.", question: "오늘은 무슨 요일입니까?", questionVi: "Hôm nay thứ mấy?", options: ["월요일", "수요일", "금요일", "일요일"], correctIndex: 0, explanationVi: "Thứ Hai." }),
  listening(1, 5, { script: "물 한 잔 주세요.", scriptVi: "Cho tôi một ly nước.", question: "무엇을 원합니까?", questionVi: "Muốn gì?", options: ["물", "커피", "우유", "주스"], correctIndex: 0, explanationVi: "Nước." }),
  listening(1, 6, { script: "한국어를 배워요.", scriptVi: "Học tiếng Hàn.", question: "무엇을 배웁니까?", questionVi: "Học gì?", options: ["한국어", "영어", "수학", "역사"], correctIndex: 0, explanationVi: "Tiếng Hàn." }),
  listening(1, 7, { script: "친구와 공원에 가요.", scriptVi: "Đi công viên với bạn.", question: "누구와 갑니까?", questionVi: "Đi với ai?", options: ["친구", "선생님", "의사", "기자"], correctIndex: 0, explanationVi: "Với bạn." }),
  listening(1, 8, { script: "저녁에 텔레비전을 봐요.", scriptVi: "Tối xem TV.", question: "저녁에 무엇을 합니까?", questionVi: "Tối làm gì?", options: ["텔레비전 보기", "운동", "공부", "요리"], correctIndex: 0, explanationVi: "Xem TV." }),
  listening(1, 9, { script: "사과가 맛있어요.", scriptVi: "Táo ngon.", question: "어떤 과일입니까?", questionVi: "Quả gì?", options: ["사과", "바나나", "포도", "수박"], correctIndex: 0, explanationVi: "Táo." }),
  listening(1, 10, { script: "버스를 타요.", scriptVi: "Đi xe buýt.", question: "무엇을 탑니까?", questionVi: "Đi gì?", options: ["버스", "자전거", "비행기", "배"], correctIndex: 0, explanationVi: "Xe buýt." }),
  listening(1, 11, { script: "도서관에서 책을 읽어요.", scriptVi: "Đọc sách ở thư viện.", question: "어디에서 책을 읽습니까?", questionVi: "Đọc sách ở đâu?", options: ["도서관", "카페", "시장", "공항"], correctIndex: 0, explanationVi: "Thư viện." }),
  listening(1, 12, { script: "날씨가 좋아요.", scriptVi: "Thời tiết đẹp.", question: "날씨가 어떻습니까?", questionVi: "Thời tiết thế nào?", options: ["좋다", "나쁘다", "춥다", "덥다"], correctIndex: 0, explanationVi: "Đẹp." }),
  listening(1, 13, { script: "엄마가 요리를 해요.", scriptVi: "Mẹ nấu ăn.", question: "누가 요리를 합니까?", questionVi: "Ai nấu?", options: ["엄마", "아빠", "형", "선생님"], correctIndex: 0, explanationVi: "Mẹ." }),
  listening(1, 14, { script: "연필로 글씨를 써요.", scriptVi: "Viết bằng bút chì.", question: "무엇으로 씁니까?", questionVi: "Viết bằng gì?", options: ["연필", "펜", "크레파스", "붓"], correctIndex: 0, explanationVi: "Bút chì." }),
  listening(1, 15, { script: "한국 음식을 좋아해요.", scriptVi: "Thích món Hàn.", question: "어떤 음식을 좋아합니까?", questionVi: "Thích món gì?", options: ["한국 음식", "중국 음식", "일본 음식", "미국 음식"], correctIndex: 0, explanationVi: "Món Hàn." }),
  listening(1, 16, { script: "아홉 시에 수업이 있어요.", scriptVi: "Có lớp lúc 9 giờ.", question: "몇 시에 수업이 있습니까?", questionVi: "Mấy giờ có lớp?", options: ["9시", "7시", "11시", "12시"], correctIndex: 0, explanationVi: "9 giờ." }),
  listening(1, 17, { script: "고양이가 귀여워요.", scriptVi: "Mèo dễ thương.", question: "어떤 동물입니까?", questionVi: "Con gì?", options: ["고양이", "개", "새", "물고기"], correctIndex: 0, explanationVi: "Mèo." }),
  listening(1, 18, { script: "우산을 가져가세요.", scriptVi: "Mang theo ô.", question: "무엇을 가져갑니까?", questionVi: "Mang gì?", options: ["우산", "모자", "장갑", "신발"], correctIndex: 0, explanationVi: "Ô." }),
  listening(1, 19, { script: "한국에 처음 왔어요.", scriptVi: "Lần đầu đến Hàn.", question: "어디에 처음 왔습니까?", questionVi: "Lần đầu đến đâu?", options: ["한국", "베트남", "일본", "미국"], correctIndex: 0, explanationVi: "Hàn Quốc." }),
  listening(1, 20, { script: "감사합니다.", scriptVi: "Cảm ơn.", question: "무슨 말입니까?", questionVi: "Nói gì?", options: ["감사", "미안", "안녕", "잘 가"], correctIndex: 0, explanationVi: "Cảm ơn." }),
  reading(1, 1, { passage: "저는 베트남 사람입니다. 한국어를 배웁니다.", question: "무엇을 배웁니까?", questionVi: "Học gì?", options: ["한국어", "영어", "역사", "체육"], correctIndex: 0, explanationVi: "Học tiếng Hàn." }),
  reading(1, 2, { passage: "이것은 책입니다. 책상 위에 있습니다.", question: "책은 어디에 있습니까?", questionVi: "Sách ở đâu?", options: ["책상 위", "침대", "의자", "바닥"], correctIndex: 0, explanationVi: "Trên bàn." }),
  reading(1, 3, { passage: "민수는 20살입니다. 대학생입니다.", question: "민수는 몇 살입니까?", questionVi: "Min-su bao nhiêu tuổi?", options: ["20살", "15살", "30살", "40살"], correctIndex: 0, explanationVi: "20 tuổi." }),
  reading(1, 4, { passage: "오늘은 토요일입니다. 쉬는 날입니다.", question: "오늘은 무슨 요일입니까?", questionVi: "Hôm nay thứ mấy?", options: ["토요일", "월요일", "수요일", "금요일"], correctIndex: 0, explanationVi: "Thứ Bảy." }),
  reading(1, 5, { passage: "가게에서 사과와 바나나를 샀습니다.", question: "무엇을 샀습니까?", questionVi: "Mua gì?", options: ["과일", "책", "옷", "신발"], correctIndex: 0, explanationVi: "Trái cây." }),
  reading(1, 6, { passage: "저는 아침에 일곱 시에 일어납니다.", question: "몇 시에 일어납니까?", questionVi: "Mấy giờ dậy?", options: ["7시", "9시", "11시", "6시"], correctIndex: 0, explanationVi: "7 giờ." }),
  reading(1, 7, { passage: "한국 음식 중 김치가 유명합니다.", question: "유명한 음식은?", questionVi: "Món nổi tiếng?", options: ["김치", "피자", "햄버거", "파스타"], correctIndex: 0, explanationVi: "Kimchi." }),
  reading(1, 8, { passage: "버스 정류장에서 기다립니다.", question: "어디에서 기다립니까?", questionVi: "Đợi ở đâu?", options: ["버스 정류장", "공항", "역", "학교"], correctIndex: 0, explanationVi: "Trạm xe buýt." }),
  reading(1, 9, { passage: "선생님은 칠판에 글씨를 씁니다.", question: "누가 글씨를 씁니까?", questionVi: "Ai viết?", options: ["선생님", "학생", "의사", "기자"], correctIndex: 0, explanationVi: "Giáo viên." }),
  reading(1, 10, { passage: "비가 와서 우산을 씁니다.", question: "왜 우산을 씁니까?", questionVi: "Vì sao dùng ô?", options: ["비가 와서", "더워서", "추워서", "바빠서"], correctIndex: 0, explanationVi: "Vì mưa." }),
  reading(1, 11, { passage: "친구 생일에 선물을 줬습니다.", question: "무엇을 줬습니까?", questionVi: "Tặng gì?", options: ["선물", "편지", "음식", "책"], correctIndex: 0, explanationVi: "Quà." }),
  reading(1, 12, { passage: "공원에서 산책을 합니다.", question: "어디에서 산책합니까?", questionVi: "Đi dạo ở đâu?", options: ["공원", "집", "학교", "회사"], correctIndex: 0, explanationVi: "Công viên." }),
  reading(1, 13, { passage: "물을 많이 마십니다. 건강에 좋습니다.", question: "무엇을 많이 마십니까?", questionVi: "Uống nhiều gì?", options: ["물", "커피", "콜라", "주스"], correctIndex: 0, explanationVi: "Nước." }),
  reading(1, 14, { passage: "저녁에 가족과 밥을 먹습니다.", question: "누구와 밥을 먹습니까?", questionVi: "Ăn với ai?", options: ["가족", "친구", "선생님", "의사"], correctIndex: 0, explanationVi: "Gia đình." }),
  reading(1, 15, { passage: "한국어 수업은 재미있습니다.", question: "수업은 어떻습니까?", questionVi: "Lớp thế nào?", options: ["재미있다", "어렵다", "지루하다", "슬프다"], correctIndex: 0, explanationVi: "Vui." }),
  reading(1, 16, { passage: "지하철이 빠릅니다.", question: "무엇이 빠릅니까?", questionVi: "Cái gì nhanh?", options: ["지하철", "버스", "자전거", "걷기"], correctIndex: 0, explanationVi: "Tàu điện ngầm." }),
  reading(1, 17, { passage: "방에 침대와 책상이 있습니다.", question: "방에 무엇이 있습니까?", questionVi: "Trong phòng có gì?", options: ["가구", "음식", "옷", "꽃"], correctIndex: 0, explanationVi: "Đồ nội thất." }),
  reading(1, 18, { passage: "오늘 날씨가 춥습니다. 코트를 입습니다.", question: "무엇을 입습니까?", questionVi: "Mặc gì?", options: ["코트", "반바지", "모자", "샌들"], correctIndex: 0, explanationVi: "Áo khoác." }),
  reading(1, 19, { passage: "한국에 친구가 있습니다.", question: "어디에 친구가 있습니까?", questionVi: "Bạn ở đâu?", options: ["한국", "베트남", "중국", "일본"], correctIndex: 0, explanationVi: "Hàn Quốc." }),
  reading(1, 20, { passage: "TOPIK 시험을 준비합니다.", question: "무엇을 준비합니까?", questionVi: "Chuẩn bị gì?", options: ["TOPIK", "운동", "요리", "여행"], correctIndex: 0, explanationVi: "TOPIK." }),
];

function cloneForLevel(q: TopikQuizQuestion, level: TopikLevel): TopikQuizQuestion {
  const suffix = q.category === "listening" ? "l" : "r";
  const num = q.id.split("-").pop() ?? "01";
  return {
    ...q,
    id: `mass-l${level}-${suffix}-${num}`,
    level,
    passage: q.passage ? `${q.passage} (TOPIK ${level})` : undefined,
  };
}

export const TOPIK_MASS_BANK: TopikQuizQuestion[] = [...LEVEL_1_BANK];

for (let level = 2 as TopikLevel; level <= 6; level++) {
  for (const q of LEVEL_1_BANK) {
    TOPIK_MASS_BANK.push(cloneForLevel(q, level));
  }
}
