/** TOPIK & related Korean exam catalog — exam-prep plan only */

import { l } from "@/topik/lib/i18n/locale-text";

export type ExamTierId = "topik-i" | "topik-ii" | "topik-ibt" | "eps-topik";

export type ExamCatalogEntry = {
  id: ExamTierId;
  titleVi: string;
  subtitleVi: string;
  levels: string;
  durationVi: string;
  sectionsVi: string[];
  href: string;
  badge?: string;
};

export const EXAM_CATALOG: ExamCatalogEntry[] = [
  {
    id: "topik-i",
    titleVi: "TOPIK I",
    subtitleVi: l(
      "Sơ cấp — dành cho người mới học 6 tháng–1 năm",
      "초급 — 한국어 6개월~1년 학습자",
    ),
    levels: l("Cấp 1–2", "1–2급"),
    durationVi: l("100 phút (thi giấy) · 60 phút (IBT)", "100분 (필기) · 60분 (IBT)"),
    sectionsVi: [l("Nghe (40 câu)", "듣기 (40문항)"), l("Đọc (40 câu)", "읽기 (40문항)")],
    href: "/topik/mock-exam?tier=topik-i",
    badge: l("Phổ biến", "인기"),
  },
  {
    id: "topik-ii",
    titleVi: "TOPIK II",
    subtitleVi: l(
      "Trung–cao cấp — du học, xin việc, định cư",
      "중·고급 — 유학, 취업, 이민",
    ),
    levels: l("Cấp 3–6", "3–6급"),
    durationVi: l("180 phút (thi giấy)", "180분 (필기)"),
    sectionsVi: [
      l("Nghe (50 câu)", "듣기 (50문항)"),
      l("Đọc (50 câu)", "읽기 (50문항)"),
      l("Viết (4 câu)", "쓰기 (4문항)"),
    ],
    href: "/topik/mock-exam?tier=topik-ii",
    badge: l("Du học", "유학"),
  },
  {
    id: "topik-ibt",
    titleVi: "TOPIK IBT",
    subtitleVi: l("Thi trên máy tính — 2025 format mới", "컴퓨터 시험 — 2025 신형식"),
    levels: l("Cấp 3–6", "3–6급"),
    durationVi: l("20 phút (mini thử) · ~110 phút (thi thật)", "20분 (미니) · ~110분 (실전)"),
    sectionsVi: [
      l("Nghe", "듣기"),
      l("Đọc", "읽기"),
      l("Viết Q51–54", "쓰기 51–54번"),
      l("Nói 6 dạng", "말하기 6유형"),
    ],
    href: "/topik/mock-exam?tier=ibt",
    badge: "IBT 2025",
  },
  {
    id: "eps-topik",
    titleVi: "EPS-TOPIK",
    subtitleVi: l(
      "Lao động Hàn Quốc — nghe + đọc, 50 câu, 70 phút",
      "한국 취업 — 듣기+읽기, 50문항, 70분",
    ),
    levels: l("Cấp 1–2 tương đương", "1–2급 상당"),
    durationVi: l("70 phút · điểm đậu 80/200", "70분 · 합격 80/200점"),
    sectionsVi: [
      l("Nghe hiểu", "듣기"),
      l("Đọc hiểu", "읽기"),
      l("Từ vựng EPS", "EPS 어휘"),
    ],
    href: "/topik/practice?category=vocabulary&level=2",
    badge: "EPS",
  },
];

export const SECTION_DRILLS = [
  {
    id: "listening",
    titleVi: l("Luyện nghe", "듣기 연습"),
    descVi: l("Script + giải thích tiếng Việt", "스크립트 + 한국어 해설"),
    href: "/topik/drill?type=listening",
  },
  {
    id: "reading",
    titleVi: l("Luyện đọc", "읽기 연습"),
    descVi: l("Đoạn văn TOPIK II", "TOPIK II 지문"),
    href: "/topik/drill?type=reading",
  },
  {
    id: "ibt-order",
    titleVi: l("Sắp xếp câu IBT", "IBT 문장 배열"),
    descVi: l("Dạng kéo-thả thi máy", "IBT 배열형 드릴"),
    href: "/topik/drill?type=order",
  },
  {
    id: "ibt-mini",
    titleVi: l("Mini set IBT", "IBT 미니 세트"),
    descVi: l("5 nghe + 5 đọc", "듣기 5 + 읽기 5"),
    href: "/topik/drill?type=mixed",
  },
  {
    id: "grammar",
    titleVi: l("Luyện ngữ pháp", "문법 연습"),
    descVi: l("Trợ từ, liên từ, cấu trúc", "조사, 접속, 문형"),
    href: "/topik/practice?category=grammar",
  },
  {
    id: "vocabulary",
    titleVi: l("Luyện từ vựng", "어휘 연습"),
    descVi: l("TOPIK I & EPS", "TOPIK I & EPS"),
    href: "/topik/practice?category=vocabulary",
  },
  {
    id: "writing",
    titleVi: l("Luyện viết", "쓰기 연습"),
    descVi: l("Q51–54 + luyện gõ IBT", "51–54번 + IBT 타이핑"),
    href: "/topik/writing",
  },
  {
    id: "speaking",
    titleVi: l("Luyện nói IBT", "IBT 말하기"),
    descVi: l("6 dạng bài nói", "말하기 6유형"),
    href: "/topik/speaking",
  },
] as const;

/** What we adopt from top apps — shown on study hub */
export const COMPETITOR_ADVANTAGES_VI = [
  {
    from: "Duolingo",
    take: l("Một bước rõ ràng mỗi ngày + streak", "매일 명확한 한 단계 + 연속 학습"),
    avoid: l("Quá nông, lặp vô tận", "너무 얕음, 무한 반복"),
  },
  {
    from: "Babbel",
    take: l("Lộ trình có cấu trúc, giải thích ngữ pháp", "구조화된 커리큘럼, 문법 설명"),
    avoid: l("Paywall đắt", "비싼 유료 전환"),
  },
  {
    from: "Migii TOPIK",
    take: l("Thi thử + lộ trình + điểm yếu", "모의고사 + 로드맵 + 약점 분석"),
    avoid: l("Bug, quảng cáo, đáp án sai", "버그, 광고, 오답"),
  },
  {
    from: "Anki/Memrise",
    take: l("SRS ôn đúng lúc", "적시 SRS 복습"),
    avoid: l("UI phức tạp", "복잡한 UI"),
  },
  {
    from: "TOPIK Master VN",
    take: l("Miễn phí · script nghe · tiếng Việt chuẩn · không quảng cáo", "무료 · 듣기 스크립트 · 광고 없음"),
    avoid: "—",
  },
];
