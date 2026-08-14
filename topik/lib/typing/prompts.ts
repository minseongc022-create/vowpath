import type { TopikLevel } from "@/topik/types";

export type TypingPrompt = {
  id: string;
  level: TopikLevel;
  korean: string;
  hintVi: string;
  /** IBT essay snippet vs sentence vs phrase */
  kind: "phrase" | "sentence" | "essay";
};

/** Korean typing drills for TOPIK IBT — target 30–40 chars/min */
export const TYPING_PROMPTS: TypingPrompt[] = [
  // Phrases — warm up
  {
    id: "t-l1-01",
    level: 1,
    kind: "phrase",
    korean: "안녕하세요. 저는 베트남 사람입니다.",
    hintVi: "Xin chào. Tôi là người Việt Nam.",
  },
  {
    id: "t-l1-02",
    level: 1,
    kind: "phrase",
    korean: "한국어를 공부합니다.",
    hintVi: "Tôi học tiếng Hàn.",
  },
  {
    id: "t-l1-03",
    level: 1,
    kind: "phrase",
    korean: "감사합니다. 잘 부탁합니다.",
    hintVi: "Cảm ơn. Xin được giúp đỡ.",
  },
  // Sentences — level 2–3
  {
    id: "t-l2-01",
    level: 2,
    kind: "sentence",
    korean: "매일 아침 한국어 단어를 외웁니다.",
    hintVi: "Mỗi sáng tôi học thuộc từ tiếng Hàn.",
  },
  {
    id: "t-l2-02",
    level: 2,
    kind: "sentence",
    korean: "어제 친구와 한국 드라마를 봤어요.",
    hintVi: "Hôm qua tôi xem phim Hàn với bạn.",
  },
  {
    id: "t-l3-01",
    level: 3,
    kind: "sentence",
    korean: "TOPIK 시험을 준비하려면 매일 조금씩 공부해야 합니다.",
    hintVi: "Để chuẩn bị thi TOPIK cần học mỗi ngày một chút.",
  },
  {
    id: "t-l3-02",
    level: 3,
    kind: "sentence",
    korean: "한국어 실력을 늘리려면 듣기와 읽기를 함께 연습하는 것이 좋습니다.",
    hintVi: "Muốn tăng trình tiếng Hàn nên luyện nghe và đọc cùng lúc.",
  },
  // Essay snippets — IBT Q53 style
  {
    id: "t-l4-01",
    level: 4,
    kind: "essay",
    korean:
      "저는 한국어를 배우는 이유는 K-pop과 K-drama를 좋아하기 때문입니다. 또한 한국에서 일하고 싶어서 TOPIK 점수가 필요합니다.",
    hintVi: "Lý do học tiếng Hàn: thích K-pop/drama + muốn làm việc tại Hàn.",
  },
  {
    id: "t-l4-02",
    level: 4,
    kind: "essay",
    korean:
      "환경 보호는 우리 모두의 책임입니다. 플라스틱 사용을 줄이고 대중교통을 이용해야 합니다. 작은 실천이 모이면 큰 변화를 만듭니다.",
    hintVi: "Bảo vệ môi trường — trách nhiệm chung, giảm nhựa, dùng PT công cộng.",
  },
  {
    id: "t-l5-01",
    level: 5,
    kind: "essay",
    korean:
      "외국인 노동자는 한국 경제 발전에 큰 기여를 하고 있습니다. 그러나 문화적 차이와 언어 장벽으로 인한 어려움도 존재합니다. 사회적 관심과 지원이 필요합니다.",
    hintVi: "Lao động nước ngoài đóng góp kinh tế nhưng cần hỗ trợ văn hóa/ngôn ngữ.",
  },
  {
    id: "t-l6-01",
    level: 6,
    kind: "essay",
    korean:
      "디지털 시대에도 종이책의 가치는 여전히 중요합니다. 집중력을 높이고 눈의 피로를 줄일 수 있기 때문입니다. 하지만 전자책의 편리함도 무시할 수 없습니다.",
    hintVi: "Giá trị sách giấy vs sách điện tử trong thời đại số.",
  },
];

export const IBT_TYPING_TARGET_CPM = 35;
export const IBT_TYPING_MIN_CPM = 30;

export function getTypingPrompts(level?: TopikLevel, kind?: TypingPrompt["kind"]): TypingPrompt[] {
  let list = [...TYPING_PROMPTS];
  if (level) list = list.filter((p) => p.level <= level);
  if (kind) list = list.filter((p) => p.kind === kind);
  return list.sort(() => Math.random() - 0.5);
}

export function countKoreanChars(text: string): number {
  return text.replace(/\s/g, "").length;
}

export function calcTypingCpm(charCount: number, durationSec: number): number {
  if (durationSec <= 0) return 0;
  return Math.round(charCount / (durationSec / 60));
}
