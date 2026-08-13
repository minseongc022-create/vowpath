/** Official TOPIK resources — links only (no copyrighted past-paper copying) */

export type OfficialResource = {
  id: string;
  titleVi: string;
  descVi: string;
  url: string;
  badge?: string;
};

export const OFFICIAL_TOPIK_RESOURCES: OfficialResource[] = [
  {
    id: "topik-portal",
    titleVi: "Trang chủ TOPIK (topik.go.kr)",
    descVi: "Thông báo kỳ thi, đăng ký, tài liệu chính thức",
    url: "https://www.topik.go.kr",
    badge: "Chính thức",
  },
  {
    id: "past-papers",
    titleVi: "9 bộ đề thi thật (PDF)",
    descVi: "Đề thi cũ do NIIED công bố — tải miễn phí, hợp pháp",
    url: "https://www.topik.go.kr/usr/cmm/topikPaper.do",
    badge: "Đề thật",
  },
  {
    id: "today-topik",
    titleVi: "Today's TOPIK — Luyện đề hàng ngày",
    descVi: "Câu hỏi mới mỗi ngày từ trang chính thức",
    url: "https://www.topik.go.kr/usr/cmm/topikToday.do",
    badge: "Hàng ngày",
  },
  {
    id: "speaking-practice",
    titleVi: "Luyện nói TOPIK IBT (chính thức)",
    descVi: "6 dạng bài nói IBT — mô phỏng giao diện thi thật",
    url: "https://www.topik.go.kr/usr/cmm/topikSpeaking.do",
    badge: "IBT",
  },
  {
    id: "ibt-guide",
    titleVi: "Hướng dẫn thi IBT 2025",
    descVi: "Cấu trúc bài thi mới: nghe, đọc, viết trên màn hình",
    url: "https://www.topik.go.kr/usr/cmm/topikInfo.do",
    badge: "IBT",
  },
  {
    id: "eps-portal",
    titleVi: "EPS-TOPIK (lao động Hàn Quốc)",
    descVi: "Thông tin thi EPS — nghe + đọc, 70 phút",
    url: "https://www.topik.go.kr/usr/cmm/topikInfo.do",
    badge: "EPS",
  },
];

export const COMMUNITY_TIPS_VI = [
  "Không quảng cáo — học tập không bị gián đoạn",
  "Script nghe + giải thích tiếng Việt sau mỗi câu",
  "Thi thử IBT có đồng hồ + lưu điểm cao nhất",
  "Chấm bài viết Q51–54 theo tiêu chí thi thật",
  "Luyện gõ tiếng Hàn 30–40 ký tự/phút cho IBT",
];
