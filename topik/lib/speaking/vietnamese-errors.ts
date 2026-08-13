import type { VietnameseErrorFlag } from "@/topik/types";

/** Common Korean pronunciation/grammar issues for Vietnamese speakers */
export const VIETNAMESE_ERROR_PATTERNS: Omit<VietnameseErrorFlag, "detected">[] = [
  {
    pattern: "final_consonant",
    explanationVi: "Người Việt thường bỏ 받침 (âm cuối) — vd: 밥 → [bap] thay vì [bap̚]",
    tipVi: "Tập nói chậm và giữ khẩu hình đóng miệng ở cuối âm tiết có ㄱ, ㅂ, ㄷ, ㅅ, ㅈ",
  },
  {
    pattern: "aspiration",
    explanationVi: "Nhầm lẫn ㄱ/ㅋ/ㄲ (bình/ khí/ cứng) — tiếng Việt không phân biệt rõ",
    tipVi: "ㅋ phải thổi hơi mạnh, ㄲ nín hơi rồi bật — nghe và lặp theo audio mẫu",
  },
  {
    pattern: "tense_lax",
    explanationVi: "Nhầm ㅓ/ㅗ hoặc ㅡ/ㅜ — nguyên âm phẳng",
    tipVi: "ㅗ môi tròn, ㅓ miệng mở; luyện cặp từ: 고/거, 구/거",
  },
  {
    pattern: "particle_iga",
    explanationVi: "Dùng sai 이/가 vs 은/는 — chủ ngữ vs chủ đề",
    tipVi: "이/가 = chủ ngữ mới; 은/는 = chủ đề đã biết. Vd: 저는 학생입니다 (O)",
  },
  {
    pattern: "honorific",
    explanationVi: "Thiếu kính ngữ — dùng 반말 trong tình huống trang trọng",
    tipVi: "TOPIK/EPS: luôn dùng -요/-습니다 trừ khi đề bài yêu cầu 반말",
  },
  {
    pattern: "flat_intonation",
    explanationVi: "Ngữ điệu phẳng — tiếng Việt có thanh điệu, tiếng Hàn có pitch accent",
    tipVi: "Nhấn âm tiết thứ 2 trong từ 2 âm tiết; nghe K-drama và bắt chước nhấn giọng",
  },
];

export function detectVietnameseErrors(transcript: string): VietnameseErrorFlag[] {
  const t = transcript.trim();
  if (!t) {
    return VIETNAMESE_ERROR_PATTERNS.map((p) => ({ ...p, detected: false }));
  }

  const hasBatchimWords = /[ㄱ-ㅎㅏ-ㅣ]+[ㄱㄴㄷㄹㅁㅂㅅㅇ]/.test(t);
  const hasHonorific = /(습니다|세요|요[.!?]?$|ㅂ니다)/.test(t);
  const hasParticles = /(은|는|이|가)\s/.test(t) || /[가-힣]+(은|는|이|가)[^가-힣]/.test(t);
  const hasAspirationPairs = /[ㅋㅌㅍㅊ]/.test(t);
  const sentenceCount = t.split(/[.!?。]/).filter(Boolean).length;
  const avgLen = t.replace(/\s/g, "").length / Math.max(sentenceCount, 1);

  return VIETNAMESE_ERROR_PATTERNS.map((p) => {
    let detected = false;
    switch (p.pattern) {
      case "final_consonant":
        detected = hasBatchimWords && avgLen < 12;
        break;
      case "aspiration":
        detected = !hasAspirationPairs && t.length > 20;
        break;
      case "tense_lax":
        detected = !/[ㅗㅜㅓ]/.test(t) && t.length > 15;
        break;
      case "particle_iga":
        detected = !hasParticles && sentenceCount >= 2;
        break;
      case "honorific":
        detected = !hasHonorific;
        break;
      case "flat_intonation":
        detected = sentenceCount >= 1 && !/[?!]/.test(t);
        break;
    }
    return { ...p, detected };
  });
}
