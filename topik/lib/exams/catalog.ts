/** TOPIK & related Korean exam catalog — exam-prep plan only */

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
    subtitleVi: "Sơ cấp — dành cho người mới học 6 tháng–1 năm",
    levels: "Cấp 1–2",
    durationVi: "100 phút (thi giấy) · 60 phút (IBT)",
    sectionsVi: ["Nghe (40 câu)", "Đọc (40 câu)"],
    href: "/topik/mock-exam?tier=topik-i",
    badge: "Phổ biến",
  },
  {
    id: "topik-ii",
    titleVi: "TOPIK II",
    subtitleVi: "Trung–cao cấp — du học, xin việc, định cư",
    levels: "Cấp 3–6",
    durationVi: "180 phút (thi giấy)",
    sectionsVi: ["Nghe (50 câu)", "Đọc (50 câu)", "Viết (4 câu)"],
    href: "/topik/mock-exam?tier=topik-ii",
    badge: "Du học",
  },
  {
    id: "topik-ibt",
    titleVi: "TOPIK IBT",
    subtitleVi: "Thi trên máy tính — 2025 format mới",
    levels: "Cấp 3–6",
    durationVi: "20 phút (mini thử) · ~110 phút (thi thật)",
    sectionsVi: ["Nghe", "Đọc", "Viết Q51–54", "Nói 6 dạng"],
    href: "/topik/mock-exam?tier=ibt",
    badge: "IBT 2025",
  },
  {
    id: "eps-topik",
    titleVi: "EPS-TOPIK",
    subtitleVi: "Lao động Hàn Quốc — nghe + đọc, 50 câu, 70 phút",
    levels: "Cấp 1–2 tương đương",
    durationVi: "70 phút · điểm đậu 80/200",
    sectionsVi: ["Nghe hiểu", "Đọc hiểu", "Từ vựng EPS"],
    href: "/topik/practice?category=vocabulary&level=2",
    badge: "EPS",
  },
];

export const SECTION_DRILLS = [
  {
    id: "listening",
    titleVi: "Luyện nghe",
    descVi: "Script + giải thích tiếng Việt",
    href: "/topik/practice?category=listening",
  },
  {
    id: "reading",
    titleVi: "Luyện đọc",
    descVi: "Đoạn văn TOPIK II",
    href: "/topik/practice?category=reading",
  },
  {
    id: "grammar",
    titleVi: "Luyện ngữ pháp",
    descVi: "Trợ từ, liên từ, cấu trúc",
    href: "/topik/practice?category=grammar",
  },
  {
    id: "vocabulary",
    titleVi: "Luyện từ vựng",
    descVi: "TOPIK I & EPS",
    href: "/topik/practice?category=vocabulary",
  },
  {
    id: "writing",
    titleVi: "Luyện viết",
    descVi: "Q51–54 + luyện gõ IBT",
    href: "/topik/writing",
  },
  {
    id: "speaking",
    titleVi: "Luyện nói IBT",
    descVi: "6 dạng bài nói",
    href: "/topik/speaking",
  },
] as const;

/** What we adopt from top apps — shown on study hub */
export const COMPETITOR_ADVANTAGES_VI = [
  { from: "Duolingo", take: "Một bước rõ ràng mỗi ngày + streak", avoid: "Quá nông, lặp vô tận" },
  { from: "Babbel", take: "Lộ trình có cấu trúc, giải thích ngữ pháp", avoid: "Paywall đắt" },
  { from: "Migii TOPIK", take: "Thi thử + lộ trình + điểm yếu", avoid: "Bug, quảng cáo, đáp án sai" },
  { from: "Anki/Memrise", take: "SRS ôn đúng lúc", avoid: "UI phức tạp" },
  { from: "TOPIK Master VN", take: "Miễn phí · script nghe · tiếng Việt chuẩn · không quảng cáo", avoid: "—" },
];
