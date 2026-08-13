/** Vocabulary — Vietnamese meaning → pick Korean (TOPIK-focused, not English fill-blank) */

export type VocabDrill = {
  id: string;
  level: number;
  meaningVi: string;
  meaningEn: string;
  wordKo: string;
  romanization: string;
  exampleKo: string;
  exampleVi: string;
  options: string[];
  correctIndex: number;
  /** Common mistake for Vietnamese learners */
  vnTip?: string;
  isNew?: boolean;
};

export const VOCAB_DRILLS: VocabDrill[] = [
  {
    id: "v1",
    level: 1,
    meaningVi: "xin chào (lịch sự)",
    meaningEn: "hello (formal)",
    wordKo: "안녕하세요",
    romanization: "annyeonghaseyo",
    exampleKo: "안녕하세요, 만나서 반갑습니다.",
    exampleVi: "Xin chào, rất vui được gặp bạn.",
    options: ["안녕하세요", "안녕", "잘 지내요?", "처음 뵙겠습니다"],
    correctIndex: 0,
    vnTip: "Người Việt hay nói quá ngắn «안녕» với người lớn — dùng «안녕하세요».",
    isNew: true,
  },
  {
    id: "v2",
    level: 2,
    meaningVi: "cảm ơn",
    meaningEn: "thank you",
    wordKo: "감사합니다",
    romanization: "gamsahamnida",
    exampleKo: "도와주셔서 감사합니다.",
    exampleVi: "Cảm ơn vì đã giúp tôi.",
    options: ["감사합니다", "고마워요", "미안합니다", "수고하세요"],
    correctIndex: 0,
    vnTip: "«고마워요» thân mật; trong lớp/thi TOPIK ưu tiên «감사합니다».",
  },
  {
    id: "v3",
    level: 2,
    meaningVi: "xin lỗi",
    meaningEn: "sorry / excuse me",
    wordKo: "죄송합니다",
    romanization: "joesonghamnida",
    exampleKo: "늦어서 죄송합니다.",
    exampleVi: "Xin lỗi vì đến muộn.",
    options: ["죄송합니다", "괜찮아요", "실례합니다", "고맙습니다"],
    correctIndex: 0,
  },
  {
    id: "v4",
    level: 3,
    meaningVi: "đi / đến",
    meaningEn: "to go",
    wordKo: "가다",
    romanization: "gada",
    exampleKo: "학교에 갑니다.",
    exampleVi: "Tôi đi đến trường.",
    options: ["가다", "오다", "이다", "있다"],
    correctIndex: 0,
    vnTip: "Đuôi «-다» là dạng từ điển — trong câu lịch sự dùng «갑니다».",
  },
  {
    id: "v5",
    level: 3,
    meaningVi: "ăn",
    meaningEn: "to eat",
    wordKo: "먹다",
    romanization: "meokda",
    exampleKo: "밥을 먹었어요.",
    exampleVi: "Tôi đã ăn cơm.",
    options: ["먹다", "마시다", "자다", "보다"],
    correctIndex: 0,
  },
  {
    id: "v6",
    level: 4,
    meaningVi: "quan trọng",
    meaningEn: "important",
    wordKo: "중요하다",
    romanization: "jungyohada",
    exampleKo: "한국어 공부가 중요해요.",
    exampleVi: "Học tiếng Hàn rất quan trọng.",
    options: ["중요하다", "재미있다", "어렵다", "필요하다"],
    correctIndex: 0,
  },
  {
    id: "v7",
    level: 2,
    meaningVi: "bao nhiêu tiền?",
    meaningEn: "how much?",
    wordKo: "얼마예요?",
    romanization: "eolmayeyo?",
    exampleKo: "이거 얼마예요?",
    exampleVi: "Cái này bao nhiêu tiền?",
    options: ["얼마예요?", "어디예요?", "뭐예요?", "몇 시예요?"],
    correctIndex: 0,
  },
  {
    id: "v8",
    level: 3,
    meaningVi: "tôi không hiểu",
    meaningEn: "I don't understand",
    wordKo: "잘 모르겠어요",
    romanization: "jal moreugesseoyo",
    exampleKo: "죄송하지만 잘 모르겠어요.",
    exampleVi: "Xin lỗi nhưng tôi không hiểu rõ.",
    options: ["잘 모르겠어요", "알겠어요", "괜찮아요", "기다려요"],
    correctIndex: 0,
    vnTip: "Cụm «잘 모르겠어요» lịch sự hơn «몰라요» trong lớp học.",
  },
];

export function getVocabDrills(limit = 8): VocabDrill[] {
  return VOCAB_DRILLS.slice(0, limit);
}
