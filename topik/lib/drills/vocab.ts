/** Fill-in-blank vocabulary drills — Korean target, native hint */

export type VocabDrill = {
  id: string;
  level: number;
  hintVi: string;
  hintEn: string;
  sentenceKo: string;
  blank: string;
  source?: string;
  isNew?: boolean;
};

export const VOCAB_DRILLS: VocabDrill[] = [
  {
    id: "v1",
    level: 2,
    hintVi: "Bạn có thể làm gì cho tôi?",
    hintEn: "What can you do for me?",
    sentenceKo: "나를 위해 뭘 ____ 줄 수 있어?",
    blank: "해",
    source: "K-drama",
    isNew: true,
  },
  {
    id: "v2",
    level: 2,
    hintVi: "Hôm nay thời tiết thế nào?",
    hintEn: "How's the weather today?",
    sentenceKo: "오늘 날씨가 ____?",
    blank: "어때요",
    source: "TOPIK I",
  },
  {
    id: "v3",
    level: 3,
    hintVi: "Tôi đã ăn cơm rồi.",
    hintEn: "I already ate.",
    sentenceKo: "저는 벌써 밥을 ____.",
    blank: "먹었어요",
    source: "Daily life",
  },
  {
    id: "v4",
    level: 3,
    hintVi: "Bạn có rảnh tối nay không?",
    hintEn: "Are you free tonight?",
    sentenceKo: "오늘 저녁에 ____?",
    blank: "시간 있어요",
    source: "Conversation",
  },
  {
    id: "v5",
    level: 4,
    hintVi: "Tôi nghĩ việc đó quan trọng.",
    hintEn: "I think that's important.",
    sentenceKo: "그 일이 중요하다고 ____.",
    blank: "생각해요",
    source: "TOPIK II",
  },
  {
    id: "v6",
    level: 2,
    hintVi: "Xin lỗi, tôi đến muộn.",
    hintEn: "Sorry I'm late.",
    sentenceKo: "늦어서 ____.",
    blank: "죄송합니다",
    source: "Politeness",
  },
  {
    id: "v7",
    level: 3,
    hintVi: "Bạn học tiếng Hàn bao lâu rồi?",
    hintEn: "How long have you studied Korean?",
    sentenceKo: "한국어를 ____ 공부했어요?",
    blank: "얼마나",
    source: "TOPIK prep",
  },
  {
    id: "v8",
    level: 4,
    hintVi: "Tôi muốn đi du lịch Hàn Quốc.",
    hintEn: "I want to travel to Korea.",
    sentenceKo: "한국으로 여행 ____.",
    blank: "가고 싶어요",
    source: "Travel",
  },
  {
    id: "v9",
    level: 2,
    hintVi: "Cái này bao nhiêu tiền?",
    hintEn: "How much is this?",
    sentenceKo: "이거 ____?",
    blank: "얼마예요",
    source: "Shopping",
  },
  {
    id: "v10",
    level: 3,
    hintVi: "Tôi không hiểu.",
    hintEn: "I don't understand.",
    sentenceKo: "____.",
    blank: "잘 모르겠어요",
    source: "Classroom",
  },
];

export function getVocabDrills(limit = 10): VocabDrill[] {
  return VOCAB_DRILLS.slice(0, limit);
}
