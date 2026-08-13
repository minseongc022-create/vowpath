/** Grammar — particle & ending choice (core for Korean, not English word order) */

export type GrammarDrill = {
  id: string;
  level: string;
  sentenceTemplate: string;
  blankLabel: string;
  instructionVi: string;
  instructionEn: string;
  options: string[];
  correctIndex: number;
  explanationVi: string;
  isNew?: boolean;
};

export const GRAMMAR_DRILLS: GrammarDrill[] = [
  {
    id: "g1",
    level: "2",
    sentenceTemplate: "저는 학교___ 갑니다.",
    blankLabel: "trợ từ",
    instructionVi: "Chọn trợ từ đi kèm «학교» (đến trường)",
    instructionEn: "Choose the particle with «학교» (to school)",
    options: ["에", "를", "이", "에서"],
    correctIndex: 0,
    explanationVi: "«에» = đến nơi (đích đến). «에서» = tại / từ nơi đó.",
    isNew: true,
  },
  {
    id: "g2",
    level: "2",
    sentenceTemplate: "물___ 마십니다.",
    blankLabel: "trợ từ",
    instructionVi: "Chọn trợ từ tân ngữ (uống nước)",
    instructionEn: "Choose the object particle (drink water)",
    options: ["을", "가", "에", "도"],
    correctIndex: 0,
    explanationVi: "«물» kết thúc bằng phụ âm → dùng «을». Người Việt hay quên trợ từ tân ngữ.",
  },
  {
    id: "g3",
    level: "3",
    sentenceTemplate: "친구___ 만났어요.",
    blankLabel: "trợ từ",
    instructionVi: "Gặp bạn — chủ ngữ hay tân ngữ?",
    instructionEn: "Met a friend — subject or object?",
    options: ["를", "가", "은", "와"],
    correctIndex: 0,
    explanationVi: "«만나다» cần tân ngữ → «친구를». «친구가» = bạn (chủ thể) gặp ai đó.",
  },
  {
    id: "g4",
    level: "3",
    sentenceTemplate: "오늘 날씨___ 좋아요.",
    blankLabel: "trợ từ",
    instructionVi: "Chọn trợ từ chủ ngữ",
    instructionEn: "Choose the subject particle",
    options: ["가", "를", "에", "도"],
    correctIndex: 0,
    explanationVi: "«날씨» không có batchim → «가». Quy tắc: có batchim → «이», không → «가».",
  },
  {
    id: "g5",
    level: "4",
    sentenceTemplate: "한국어___ 공부하고 있어요.",
    blankLabel: "trợ từ",
    instructionVi: "Học tiếng Hàn — trợ từ nào?",
    instructionEn: "Studying Korean — which particle?",
    options: ["를", "가", "에", "으로"],
    correctIndex: 0,
    explanationVi: "«공부하다» + tân ngữ «를». «에» dùng với động từ đi đến, không phải «공부하다».",
  },
  {
    id: "g6",
    level: "3",
    sentenceTemplate: "어제 영화___ 봤어요.",
    blankLabel: "trợ từ",
    instructionVi: "Xem phim hôm qua",
    instructionEn: "Watched a movie yesterday",
    options: ["를", "가", "에서", "와"],
    correctIndex: 0,
    explanationVi: "«보다» (xem) + tân ngữ «영화를».",
  },
];

export function getGrammarDrills(limit = 6): GrammarDrill[] {
  return GRAMMAR_DRILLS.slice(0, limit);
}
