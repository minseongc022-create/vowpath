/** Themed conversation modules — Malhaeboka 실전회화 style */

export type ConversationTheme = {
  id: string;
  category: "special" | "workplace" | "daily" | "topik";
  titleVi: string;
  titleEn: string;
  subtitleVi: string;
  gradient: string;
  href: string;
  progress?: number;
};

export const CONVERSATION_THEMES: ConversationTheme[] = [
  {
    id: "kpop",
    category: "special",
    titleVi: "K-pop: Fan meeting",
    titleEn: "K-pop: Fan meeting",
    subtitleVi: "Chào idol, xin chữ ký",
    gradient: "linear-gradient(135deg, #c94c55 0%, #e8a855 100%)",
    href: "/topik/speaking?theme=kpop",
    progress: 0,
  },
  {
    id: "kdrama",
    category: "special",
    titleVi: "K-drama: Cảnh quen",
    titleEn: "K-drama: Classic scenes",
    subtitleVi: "Học câu thoại nổi tiếng",
    gradient: "linear-gradient(135deg, #2a9d8f 0%, #5b9bd5 100%)",
    href: "/topik/speaking?theme=kdrama",
    progress: 35,
  },
  {
    id: "interview",
    category: "workplace",
    titleVi: "Phỏng vấn việc làm",
    titleEn: "Job interview",
    subtitleVi: "Giới thiệu bản thân · TOPIK",
    gradient: "linear-gradient(135deg, #5b6b8a 0%, #8a9bb5 100%)",
    href: "/topik/speaking?theme=interview",
  },
  {
    id: "cafe",
    category: "workplace",
    titleVi: "Part-time quán cà phê",
    titleEn: "Café part-time",
    subtitleVi: "Gọi món · phục vụ khách",
    gradient: "linear-gradient(135deg, #8b6914 0%, #d4a017 100%)",
    href: "/topik/speaking?theme=cafe",
  },
  {
    id: "market",
    category: "daily",
    titleVi: "Đi chợ · siêu thị",
    titleEn: "Market & grocery",
    subtitleVi: "Hỏi giá · thanh toán",
    gradient: "linear-gradient(135deg, #d97070 0%, #f0b880 100%)",
    href: "/topik/speaking?theme=market",
  },
  {
    id: "friends",
    category: "daily",
    titleVi: "Kết bạn với người Hàn",
    titleEn: "Making Korean friends",
    subtitleVi: "Casual speech · 반말",
    gradient: "linear-gradient(135deg, #3dbda8 0%, #7ecfc0 100%)",
    href: "/topik/speaking?theme=friends",
  },
  {
    id: "topik-speaking",
    category: "topik",
    titleVi: "TOPIK IBT Speaking",
    titleEn: "TOPIK IBT Speaking",
    subtitleVi: "6 câu hỏi · chấm AI",
    gradient: "linear-gradient(135deg, #c94c55 0%, #b03d46 100%)",
    href: "/topik/speaking",
    progress: 10,
  },
  {
    id: "study-abroad",
    category: "topik",
    titleVi: "Du học Hàn Quốc",
    titleEn: "Study in Korea",
    subtitleVi: "Visa · ký túc xá · lớp học",
    gradient: "linear-gradient(135deg, #5b9bd5 0%, #2a9d8f 100%)",
    href: "/topik/speaking?theme=study-abroad",
  },
];

export function getThemesByCategory(category: ConversationTheme["category"]) {
  return CONVERSATION_THEMES.filter((t) => t.category === category);
}
