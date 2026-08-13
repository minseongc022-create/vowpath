import type { TopikQuizQuestion, TopikLevel } from "@/topik/types";

export const TOPIK_QUIZ_BANK: TopikQuizQuestion[] = [
  // Level 1
  {
    id: "q-l1-1",
    level: 1,
    type: "multiple_choice",
    category: "vocabulary",
    question: "「안녕하세요」의 뜻은?",
    questionVi: "「안녕하세요」 nghĩa là gì?",
    options: ["Xin chào", "Cảm ơn", "Tạm biệt", "Xin lỗi"],
    correctIndex: 0,
    explanation: "안녕하세요 is a formal greeting meaning hello.",
    explanationVi: "안녕하세요 là lời chào trang trọng, nghĩa là xin chào.",
  },
  {
    id: "q-l1-2",
    level: 1,
    type: "multiple_choice",
    category: "grammar",
    question: "저는 학생___ .",
    questionVi: "Điền trợ từ đúng: 저는 학생___ .",
    options: ["이", "을", "에", "입니다"],
    correctIndex: 3,
    explanation: "입니다 is the copula for formal statements.",
    explanationVi: "입니다 là động từ liên kết trang trọng, nghĩa là 'là'.",
  },
  {
    id: "q-l1-3",
    level: 1,
    type: "multiple_choice",
    category: "vocabulary",
    question: "「감사합니다」의 뜻은?",
    questionVi: "「감사합니다」 nghĩa là gì?",
    options: ["Xin lỗi", "Cảm ơn", "Không sao", "Xin chào"],
    correctIndex: 1,
    explanation: "감사합니다 means thank you.",
    explanationVi: "감사합니다 nghĩa là cảm ơn.",
  },
  // Level 2
  {
    id: "q-l2-1",
    level: 2,
    type: "multiple_choice",
    category: "grammar",
    question: "어제 영화를 ___.",
    questionVi: "Chia động từ: 어제 영화를 ___. (xem phim hôm qua)",
    options: ["봐요", "봤어요", "볼 거예요", "보세요"],
    correctIndex: 1,
    explanation: "Past tense of 보다 is 봤어요.",
    explanationVi: "Thì quá khứ của 보다 (xem) là 봤어요.",
  },
  {
    id: "q-l2-2",
    level: 2,
    type: "multiple_choice",
    category: "grammar",
    question: "학교___ 공부해요.",
    questionVi: "Điền trợ từ: 학교___ 공부해요. (học ở trường)",
    options: ["을", "에서", "에게", "와"],
    correctIndex: 1,
    explanation: "에서 marks location of action.",
    explanationVi: "에서 chỉ nơi diễn ra hành động.",
  },
  {
    id: "q-l2-3",
    level: 2,
    type: "short_answer",
    category: "vocabulary",
    question: "「친구」를 베트남어로?",
    questionVi: "Dịch 「친구」 sang tiếng Việt",
    correctAnswer: "bạn",
    explanation: "친구 means friend.",
    explanationVi: "친구 nghĩa là bạn bè.",
  },
  // Level 3
  {
    id: "q-l3-1",
    level: 3,
    type: "multiple_choice",
    category: "reading",
    question: "비가 와___ 집에 있었어요.",
    questionVi: "Điền liên từ: 비가 와___ 집에 있었어요.",
    options: ["고", "서", "지만", "면"],
    correctIndex: 1,
    explanation: "-아/어서 shows cause/reason.",
    explanationVi: "-아/어서 diễn tả nguyên nhân → vì trời mưa nên ở nhà.",
    passage: "어제 비가 많이 왔습니다.",
  },
  {
    id: "q-l3-2",
    level: 3,
    type: "multiple_choice",
    category: "grammar",
    question: "열심히 공부했___ 시험에 떨어졌어요.",
    questionVi: "Điền liên từ phù hợp",
    options: ["고", "지만", "서", "면"],
    correctIndex: 1,
    explanation: "-지만 expresses contrast.",
    explanationVi: "-지만 diễn tả tương phản: dù học chăm nhưng trượt.",
  },
  {
    id: "q-l3-3",
    level: 3,
    type: "multiple_choice",
    category: "vocabulary",
    question: "「따라서」의 뜻은?",
    questionVi: "「따라서」 nghĩa là gì?",
    options: ["Tuy nhiên", "Do đó", "Hơn nữa", "Ví dụ"],
    correctIndex: 1,
    explanation: "따라서 means therefore/so.",
    explanationVi: "따라서 nghĩa là do đó, vì vậy.",
  },
  // Level 4
  {
    id: "q-l4-1",
    level: 4,
    type: "multiple_choice",
    category: "writing",
    question: "공부할___ 재미있어요.",
    questionVi: "Điền: 공부할___ 재미있어요. (càng học càng thú vị)",
    options: ["수록", "때문에", "반면", "덕분에"],
    correctIndex: 0,
    explanation: "-(으)ㄹ수록 means the more ~ the more.",
    explanationVi: "-(으)ㄹ수록 = càng ~ càng.",
  },
  {
    id: "q-l4-2",
    level: 4,
    type: "multiple_choice",
    category: "grammar",
    question: "선생님 ___ 합격했어요.",
    questionVi: "Điền: 선생님 ___ 합격했어요. (nhờ thầy mà đậu)",
    options: ["덕분에", "때문에", "반면에", "대신"],
    correctIndex: 0,
    explanation: "덕분에 expresses thanks for a positive result.",
    explanationVi: "덕분에 = nhờ có (kết quả tích cực).",
  },
  // Level 5
  {
    id: "q-l5-1",
    level: 5,
    type: "multiple_choice",
    category: "grammar",
    question: "가격이 싸___ 맛도 좋다.",
    questionVi: "Không những rẻ mà còn ngon",
    options: ["뿐만 아니라", "지언정", "마련이다", "셈이다"],
    correctIndex: 0,
    explanation: "-(으)ㄹ 뿐만 아니라 = not only but also.",
    explanationVi: "-(으)ㄹ 뿐만 아니라 = không những ~ mà còn.",
  },
  {
    id: "q-l5-2",
    level: 5,
    type: "multiple_choice",
    category: "reading",
    question: "실패할 수도 있는 ___ .",
    questionVi: "Điền: 실패할 수도 있는 ___ . (đương nhiên có thể thất bại)",
    options: ["마련이다", "셈이다", "뿐이다", "법이다"],
    correctIndex: 0,
    explanation: "-(으)ㄹ/ㄴ 마련이다 = it is natural that.",
    explanationVi: "마련이다 = đương nhiên, tất nhiên là.",
  },
  // Level 6
  {
    id: "q-l6-1",
    level: 6,
    type: "multiple_choice",
    category: "grammar",
    question: "힘들___ 포기하지 않겠다.",
    questionVi: "Dù khó nhưng sẽ không bỏ cuộc",
    options: ["지언정", "뿐만 아니라", "마련이다", "셈이다"],
    correctIndex: 0,
    explanation: "-(으)ㄹ지언정 = even though.",
    explanationVi: "-(으)ㄹ지언정 = dù ~ nhưng (nhấn mạnh quyết tâm).",
  },
];

export function getQuestions(params: {
  level?: TopikLevel;
  category?: string;
  limit?: number;
}): TopikQuizQuestion[] {
  let qs = [...TOPIK_QUIZ_BANK];
  if (params.level) qs = qs.filter((q) => q.level === params.level);
  if (params.category) qs = qs.filter((q) => q.category === params.category);
  qs.sort(() => Math.random() - 0.5);
  return qs.slice(0, params.limit ?? qs.length);
}

export function getQuestionById(id: string): TopikQuizQuestion | undefined {
  return TOPIK_QUIZ_BANK.find((q) => q.id === id);
}
