/** Listening — dictation + minimal pairs for Vietnamese learners */

export type ListeningDrill =
  | {
      id: string;
      level: number;
      type: "dictation";
      audioText: string;
      acceptedAnswers: string[];
      hintVi: string;
    }
  | {
      id: string;
      level: number;
      type: "minimal_pair";
      audioText: string;
      hintVi: string;
      options: string[];
      correctIndex: number;
      pairNoteVi: string;
    };

export const LISTENING_DRILLS: ListeningDrill[] = [
  {
    id: "l1",
    level: 1,
    type: "dictation",
    audioText: "안녕하세요",
    acceptedAnswers: ["안녕하세요", "annyeonghaseyo"],
    hintVi: "Lời chào lịch sự",
  },
  {
    id: "l2",
    level: 2,
    type: "minimal_pair",
    audioText: "커피",
    hintVi: "Nghe và chọn đúng từ",
    options: ["커피", "거피", "커피요", "커피가"],
    correctIndex: 0,
    pairNoteVi: "Phân biệt ㅓ/ㅗ — người Việt hay nhầm âm «eo» và «o».",
  },
  {
    id: "l3",
    level: 2,
    type: "minimal_pair",
    audioText: "고기",
    hintVi: "Nghe và chọn đúng từ",
    options: ["고기", "코기", "고치", "곡이"],
    correctIndex: 0,
    pairNoteVi: "Phân biệt ㄱ/ㅋ — «g» nhẹ vs «k» mạnh.",
  },
  {
    id: "l4",
    level: 3,
    type: "dictation",
    audioText: "오늘 날씨가 좋아요",
    acceptedAnswers: ["오늘 날씨가 좋아요", "oneul nalssiga joayo"],
    hintVi: "Thời tiết hôm nay đẹp",
  },
  {
    id: "l5",
    level: 3,
    type: "dictation",
    audioText: "한국어를 공부하고 있어요",
    acceptedAnswers: ["한국어를 공부하고 있어요"],
    hintVi: "Đang học tiếng Hàn — chú ý trợ từ «를»",
  },
];

export function getListeningDrills(limit = 5): ListeningDrill[] {
  return LISTENING_DRILLS.slice(0, limit);
}

export function normalizeListeningAnswer(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

export function checkDictation(raw: string, accepted: string[]): boolean {
  const n = normalizeListeningAnswer(raw);
  return accepted.some((a) => normalizeListeningAnswer(a) === n);
}

function speakKorean(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 0.82;
  window.speechSynthesis.speak(u);
}

export { speakKorean };
