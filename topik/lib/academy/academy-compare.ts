export type AcademyCompareRow = {
  id: string;
  categoryVi: string;
  categoryKo: string;
  academyVi: string;
  academyKo: string;
  usVi: string;
  usKo: string;
};

export const ACADEMY_COMPARE_ROWS: AcademyCompareRow[] = [
  {
    id: "cost",
    categoryVi: "Chi phí",
    categoryKo: "비용",
    academyVi: "3–6 triệu/tháng + đi lại",
    academyKo: "월 15–30만원 + 교통비",
    usVi: "Miễn phí · không quảng cáo",
    usKo: "무료 · 광고 없음",
  },
  {
    id: "schedule",
    categoryVi: "Lịch học",
    categoryKo: "수업 일정",
    academyVi: "Cố định · bỏ lỡ = mất buổi",
    academyKo: "고정 시간 · 결석 = 손해",
    usVi: "24/7 · học lúc nào cũng được",
    usKo: "24/7 · 언제든 학습",
  },
  {
    id: "path",
    categoryVi: "Lộ trình",
    categoryKo: "커리큘럼",
    academyVi: "Chung cho cả lớp",
    academyKo: "반 전체 동일 진도",
    usVi: "Cá nhân theo chẩn đoán + điểm yếu",
    usKo: "진단·약점 맞춤 개인 로드맵",
  },
  {
    id: "exam",
    categoryVi: "TOPIK/IBT",
    categoryKo: "TOPIK/IBT",
    academyVi: "Tùy giáo viên · đôi khi lệch đề",
    academyKo: "강사마다 다름 · 출제 경향 차이",
    usVi: "Drill IBT · mock · chấm AI theo tiêu chí thi",
    usKo: "IBT 드릴 · 모의고사 · 실전 기준 AI 채점",
  },
  {
    id: "feedback",
    categoryVi: "Phản hồi",
    categoryKo: "피드백",
    academyVi: "1 lần/tuần hoặc khi hỏi",
    academyKo: "주 1회 또는 질문 시",
    usVi: "Ngay sau mỗi bài · script nghe · giải thích VI",
    usKo: "매 문제 직후 · 듣기 스크립트 · 해설",
  },
];

export const APP_COMPARE_ROWS = [
  {
    id: "duolingo",
    nameVi: "Duolingo",
    nameKo: "Duolingo",
    usVi: "Lộ trình hàng ngày + streak như lớp học",
    usKo: "매일 수업 + 연속 학습",
    themVi: "Quá nông · không sát TOPIK",
    themKo: "너무 얕음 · TOPIK과 거리",
  },
  {
    id: "migii",
    nameVi: "Migii TOPIK",
    nameKo: "Migii TOPIK",
    usVi: "Mock + lộ trình + không quảng cáo",
    usKo: "모의고사 + 로드맵 + 광고 없음",
    themVi: "Bug · đáp án sai · quảng cáo",
    themKo: "버그 · 오답 · 광고",
  },
  {
    id: "hagwon",
    nameVi: "Học viện offline",
    nameKo: "오프라인 학원",
    usVi: "Cùng cấu trúc · rẻ hơn · linh hoạt hơn",
    usKo: "같은 구조 · 더 저렴 · 더 유연",
    themVi: "Đắt · cố định giờ · không cá nhân hóa sâu",
    themKo: "비쌈 · 고정 시간 · 개인화 한계",
  },
] as const;
