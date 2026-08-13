import type { WritingTaskType } from "@/topik/types";

export const WRITING_PROMPTS: Record<
  WritingTaskType,
  { prompt: string; promptVi: string; wordLimit?: number; minChars?: number; maxScore: number }
> = {
  "51": {
    prompt: "다음을 보고 ㉠, ㉡에 들어갈 알맞은 말을 각각 한 단어로 쓰십시오.\n\n한국어를 (㉠)___ 공부하면 (㉡)___ 재미있어집니다.",
    promptVi: "Điền một từ vào (㉠) và (㉡): Học tiếng Hàn (㉠)___ thì sẽ (㉡)___ thú vị hơn.",
    maxScore: 10,
  },
  "52": {
    prompt: "다음을 보고 ㉠, ㉡에 들어갈 알맞은 문장을 각각 쓰십시오.\n\n베트남에서 한국어를 배우는 학생이 많아지고 있다. (㉠) ___. (㉡) ___.",
    promptVi: "Viết câu hoàn chỉnh vào (㉠) và (㉡) dựa trên ngữ cảnh: Ngày càng nhiều sinh viên Việt Nam học tiếng Hàn.",
    maxScore: 10,
  },
  "53": {
    prompt: "다음 주제에 대해 400~500자로 글을 쓰십시오.\n\n주제: 한국어를 배우는 이유와 목표",
    promptVi:
      "Viết bài 400–500 ký tự (IBT 2025) về chủ đề: Lý do và mục tiêu học tiếng Hàn. Nêu quan điểm + 2 lý do.",
    wordLimit: 500,
    minChars: 400,
    maxScore: 30,
  },
  "54": {
    prompt: "다음 주제에 대해 600~700자로 글을 쓰십시오.\n\n주제: 외국인 노동자의 한국 사회 기여",
    promptVi:
      "Viết bài luận 600–700 ký tự về chủ đề: Đóng góp của lao động nước ngoài cho xã hội Hàn Quốc",
    wordLimit: 700,
    minChars: 600,
    maxScore: 50,
  },
};

export function countKoreanChars(text: string): number {
  return text.replace(/\s/g, "").length;
}
