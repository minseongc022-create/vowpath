/** Listening drills — hear Korean, type what you heard */

export type ListeningDrill = {
  id: string;
  level: number;
  audioText: string;
  acceptedAnswers: string[];
  hintVi?: string;
};

export const LISTENING_DRILLS: ListeningDrill[] = [
  {
    id: "l1",
    level: 2,
    audioText: "안녕하세요",
    acceptedAnswers: ["안녕하세요", "annyeonghaseyo"],
    hintVi: "Lời chào lịch sự",
  },
  {
    id: "l2",
    level: 2,
    audioText: "감사합니다",
    acceptedAnswers: ["감사합니다", "gamsahamnida"],
    hintVi: "Cảm ơn",
  },
  {
    id: "l3",
    level: 3,
    audioText: "오늘 날씨가 좋아요",
    acceptedAnswers: ["오늘 날씨가 좋아요", "oneul nalssiga joayo"],
    hintVi: "Thời tiết hôm nay đẹp",
  },
  {
    id: "l4",
    level: 3,
    audioText: "한국어를 공부하고 있어요",
    acceptedAnswers: ["한국어를 공부하고 있어요", "hangugeoreul gongbuhago isseoyo"],
    hintVi: "Đang học tiếng Hàn",
  },
  {
    id: "l5",
    level: 4,
    audioText: "내일 시험이 있어서 바빠요",
    acceptedAnswers: ["내일 시험이 있어서 바빠요"],
    hintVi: "Ngày mai có thi nên bận",
  },
];

export function getListeningDrills(limit = 5): ListeningDrill[] {
  return LISTENING_DRILLS.slice(0, limit);
}

export function normalizeListeningAnswer(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

export function checkListeningAnswer(raw: string, drill: ListeningDrill): boolean {
  const n = normalizeListeningAnswer(raw);
  return drill.acceptedAnswers.some((a) => normalizeListeningAnswer(a) === n);
}
