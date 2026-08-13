import type { SpeakingScenario } from "@/topik/types";

/** TOPIK IBT / EPS speaking scenarios tuned for Vietnamese learners */
export const SPEAKING_SCENARIOS: SpeakingScenario[] = [
  {
    id: "self-intro",
    titleVi: "Giới thiệu bản thân",
    promptKo: "안녕하세요. 이름, 나이, 고향, 취미를 포함해서 자기소개를 해 보세요. (30초~1분)",
    promptVi: "Xin chào. Hãy giới thiệu bản thân gồm tên, tuổi, quê quán và sở thích (30 giây–1 phút).",
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
    titleVi: "Giới thiệu quê hương",
    promptKo: "고향에 대해 설명해 보세요. 어디에 있고, 무엇이 유명한지 말해 주세요.",
    promptVi: "Hãy giới thiệu quê hương của bạn: ở đâu và nổi tiếng vì điều gì.",
    sampleAnswerKo:
      "제 고향은 호치민입니다. 베트남 남부에 있고, 음식과 커피로 유명합니다.",
    level: 3,
    hintsVi: [
      "Dùng -에 있어요 / -로 유명해요",
      "Tránh bỏ 받침 ở cuối âm tiết",
    ],
  },
  {
    id: "restaurant",
    titleVi: "Gọi món ở nhà hàng",
    promptKo: "한국 식당에서 음식을 주문하는 상황입니다. 메뉴를 고르고 주문해 보세요.",
    promptVi: "Tình huống gọi món tại nhà hàng Hàn. Chọn món và đặt hàng.",
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
    titleVi: "EPS — Phỏng vấn làm việc",
    promptKo: "한국에서 일하고 싶은 이유와 본인의 강점을 말해 보세요.",
    promptVi: "EPS: Nói lý do muốn làm việc tại Hàn Quốc và điểm mạnh của bạn.",
    sampleAnswerKo:
      "한국에서 일하고 싶은 이유는 경험을 쌓고 가족을 돕고 싶어서입니다. 저는 성실하고 책임감이 강합니다.",
    level: 3,
    hintsVi: [
      "-고 싶어서 / -려고 합니다 cho mục đích",
      "EPS hay hỏi về kinh nghiệm và thái độ",
    ],
  },
  {
    id: "topik-interview",
    titleVi: "TOPIK IBT — Nói theo chủ đề",
    promptKo: "환경 보호의 중요성에 대해 1분 동안 말해 보세요.",
    promptVi: "TOPIK IBT: Nói về tầm quan trọng của bảo vệ môi trường trong 1 phút.",
    sampleAnswerKo:
      "환경 보호는 매우 중요합니다. 플라스틱을 줄이고 대중교통을 이용해야 합니다. 모두가 함께 노력해야 합니다.",
    level: 4,
    hintsVi: [
      "Cấu trúc: 주장 → lý do → kết luận",
      "Dùng -아/어야 합니다, -고 있습니다",
    ],
  },
];

export function getSpeakingScenario(id: string): SpeakingScenario | undefined {
  return SPEAKING_SCENARIOS.find((s) => s.id === id);
}
