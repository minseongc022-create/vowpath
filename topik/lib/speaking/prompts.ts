import type { SpeakingScenario } from "@/topik/types";

/**
 * TOPIK IBT Speaking — 6 official task types (original prompts, not copied from past exams).
 * @see https://www.topik.go.kr/usr/cmm/topikSpeaking.do
 */
export const SPEAKING_SCENARIOS: SpeakingScenario[] = [
  {
    id: "self-intro",
    titleVi: "유형 1 — Giới thiệu bản thân",
    promptKo: "안녕하세요. 이름, 나이, 고향, 취미를 포함해서 자기소개를 해 보세요. (30초~1분)",
    promptVi: "IBT dạng 1: Giới thiệu tên, tuổi, quê quán, sở thích (30 giây–1 phút).",
    sampleAnswerKo:
      "안녕하세요. 저는 응웬민입니다. 베트남 하노이에서 왔고, 스물다섯 살입니다. 취미는 한국 드라마 보기입니다.",
    level: 2,
    hintsVi: [
      "Bắt đầu bằng 안녕하세요",
      "Dùng 저는 …입니다 cho tên và tuổi",
      "Nói chậm, nhấn âm cuối (받침)",
    ],
  },
  {
    id: "hometown",
    titleVi: "유형 2 — Mô tả tranh / tình huống",
    promptKo: "그림을 보고 무엇이 일어나고 있는지 설명해 보세요.",
    promptVi: "IBT dạng 2: Mô tả tranh — nói những gì đang diễn ra trong hình.",
    sampleAnswerKo:
      "사진에는 사람들이 공원에서 운동하고 있습니다. 아이들은 자전거를 타고 있고, 할아버지는 산책하고 있습니다.",
    level: 3,
    hintsVi: [
      "Dùng -고 있습니다 cho hành động đang diễn ra",
      "Mô tả từng chi tiết trong tranh",
    ],
  },
  {
    id: "restaurant",
    titleVi: "유형 3 — Hội thoại / đặt hàng",
    promptKo: "한국 식당에서 음식을 주문하는 상황입니다. 메뉴를 고르고 주문해 보세요.",
    promptVi: "IBT dạng 3: Tình huống gọi món tại nhà hàng Hàn — chọn món và đặt hàng.",
    sampleAnswerKo:
      "저기요, 비빔밥 하나랑 김치찌개 주세요. 맵지 않게 해 주세요.",
    level: 2,
    hintsVi: [
      "Dùng …주세요 để yêu cầu lịch sự",
      "Phân biệt ㄱ/ㅋ/ㄲ — không đọc phẳng như tiếng Việt",
    ],
  },
  {
    id: "job-eps",
    titleVi: "유형 4 — Trả lời câu hỏi",
    promptKo: "한국에서 일하고 싶은 이유와 본인의 강점을 말해 보세요.",
    promptVi: "IBT dạng 4: Trả lời câu hỏi — lý do muốn làm việc tại Hàn và điểm mạnh.",
    sampleAnswerKo:
      "한국에서 일하고 싶은 이유는 경험을 쌓고 가족을 돕고 싶어서입니다. 저는 성실하고 책임감이 강합니다.",
    level: 3,
    hintsVi: [
      "-고 싶어서 / -려고 합니다 cho mục đích",
      "Trả lời đủ 2 phần: lý do + điểm mạnh",
    ],
  },
  {
    id: "topik-interview",
    titleVi: "유형 5 — Nói theo chủ đề",
    promptKo: "환경 보호의 중요성에 대해 1분 동안 말해 보세요.",
    promptVi: "IBT dạng 5: Nói về tầm quan trọng bảo vệ môi trường trong 1 phút.",
    sampleAnswerKo:
      "환경 보호는 매우 중요합니다. 플라스틱을 줄이고 대중교통을 이용해야 합니다. 모두가 함께 노력해야 합니다.",
    level: 4,
    hintsVi: [
      "Cấu trúc: quan điểm → 2 lý do → kết luận",
      "Dùng -아/어야 합니다, -고 있습니다",
    ],
  },
  {
    id: "topik-presentation",
    titleVi: "유형 6 — Thuyết trình ngắn",
    promptKo: "한국어를 배우는 좋은 방법 세 가지를 소개해 보세요. (1~2분)",
    promptVi: "IBT dạng 6: Thuyết trình ngắn — giới thiệu 3 cách học tiếng Hàn hiệu quả (1–2 phút).",
    sampleAnswerKo:
      "첫째, 매일 조금씩 공부하는 것이 중요합니다. 둘째, 한국 드라마나 뉴스를 보면서 듣기 실력을 키울 수 있습니다. 셋째, 한국 친구와 대화 연습을 하면 좋습니다.",
    level: 5,
    hintsVi: [
      "Dùng 첫째, 둘째, 셋째 để liệt kê",
      "Mỗi ý nói 2–3 câu, kết thúc bằng tóm tắt",
    ],
  },
];

export function getSpeakingScenario(id: string): SpeakingScenario | undefined {
  return SPEAKING_SCENARIOS.find((s) => s.id === id);
}
