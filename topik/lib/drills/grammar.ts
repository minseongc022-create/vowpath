/** Grammar sentence building — tap word blocks (Korean particles & endings) */

export type GrammarDrill = {
  id: string;
  level: string;
  hintVi: string;
  hintEn: string;
  promptKo: string;
  instructionVi: string;
  blocks: string[];
  answer: string[];
  isNew?: boolean;
};

export const GRAMMAR_DRILLS: GrammarDrill[] = [
  {
    id: "g1",
    level: "3-1",
    hintVi: "Cái đó vui không?",
    hintEn: "Was that fun?",
    promptKo: "그거 재밌었어?",
    instructionVi: "Hãy đổi thành câu hỏi (의문문)",
    blocks: ["재밌", "었", "어", "?", "그거", "가"],
    answer: ["그거", "재밌", "었", "어", "?"],
    isNew: true,
  },
  {
    id: "g2",
    level: "2-2",
    hintVi: "Tôi đi chợ.",
    hintEn: "I go to the market.",
    promptKo: "저는 시장에 가요.",
    instructionVi: "Ghép câu khẳng định lịch sự",
    blocks: ["가요", "시장", "에", "저는"],
    answer: ["저는", "시장", "에", "가요"],
  },
  {
    id: "g3",
    level: "3-2",
    hintVi: "Vì trời lạnh nên tôi mặc áo khoác.",
    hintEn: "Because it's cold, I wear a jacket.",
    promptKo: "날씨가 추워서 외투를 입었어요.",
    instructionVi: "Sắp xếp câu với -아/어서",
    blocks: ["입었어요", "추워서", "외투를", "날씨가"],
    answer: ["날씨가", "추워서", "외투를", "입었어요"],
  },
  {
    id: "g4",
    level: "4-1",
    hintVi: "Nếu có thời gian, tôi sẽ gặp bạn.",
    hintEn: "If I have time, I'll meet you.",
    promptKo: "시간이 있으면 만날게요.",
    instructionVi: "Ghép câu điều kiện -(으)면",
    blocks: ["만날게요", "있으면", "시간이"],
    answer: ["시간이", "있으면", "만날게요"],
  },
  {
    id: "g5",
    level: "3-3",
    hintVi: "Học tiếng Hàn khó nhưng thú vị.",
    hintEn: "Korean is hard but fun.",
    promptKo: "한국어는 어렵지만 재미있어요.",
    instructionVi: "Ghép câu với -지만",
    blocks: ["재미있어요", "어렵지만", "한국어는"],
    answer: ["한국어는", "어렵지만", "재미있어요"],
  },
];

export function getGrammarDrills(limit = 5): GrammarDrill[] {
  return GRAMMAR_DRILLS.slice(0, limit);
}
