/** Official TOPIK resources — links only (no copyrighted past-paper copying) */

import { l } from "@/topik/lib/i18n/locale-text";

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
    titleVi: l("Trang chủ TOPIK (topik.go.kr)", "TOPIK 공식 홈 (topik.go.kr)"),
    descVi: l(
      "Thông báo kỳ thi, đăng ký, tài liệu chính thức",
      "시험 공고, 접수, 공식 자료",
    ),
    url: "https://www.topik.go.kr",
    badge: l("Chính thức", "공식"),
  },
  {
    id: "past-papers",
    titleVi: l("9 bộ đề thi thật (PDF)", "실전 기출 9회 (PDF)"),
    descVi: l(
      "Đề thi cũ do NIIED công bố — tải miễn phí, hợp pháp",
      "NIIED 공개 기출 — 무료·합법 다운로드",
    ),
    url: "https://www.topik.go.kr/usr/cmm/topikPaper.do",
    badge: l("Đề thật", "실전"),
  },
  {
    id: "today-topik",
    titleVi: l("Today's TOPIK — Luyện đề hàng ngày", "Today's TOPIK — 매일 문제"),
    descVi: l("Câu hỏi mới mỗi ngày từ trang chính thức", "공식 사이트 매일 새 문제"),
    url: "https://www.topik.go.kr/usr/cmm/topikToday.do",
    badge: l("Hàng ngày", "매일"),
  },
  {
    id: "speaking-practice",
    titleVi: l("Luyện nói TOPIK IBT (chính thức)", "TOPIK IBT 말하기 (공식)"),
    descVi: l("6 dạng bài nói IBT — mô phỏng giao diện thi thật", "IBT 말하기 6유형 — 실전 UI"),
    url: "https://www.topik.go.kr/usr/cmm/topikSpeaking.do",
    badge: "IBT",
  },
  {
    id: "ibt-guide",
    titleVi: l("Hướng dẫn thi IBT 2025", "IBT 2025 시험 안내"),
    descVi: l(
      "Cấu trúc bài thi mới: nghe, đọc, viết trên màn hình",
      "신형식: 듣기, 읽기, 화면 쓰기",
    ),
    url: "https://www.topik.go.kr/usr/cmm/topikInfo.do",
    badge: "IBT",
  },
  {
    id: "eps-portal",
    titleVi: l("EPS-TOPIK (lao động Hàn Quốc)", "EPS-TOPIK (한국 취업)"),
    descVi: l("Thông tin thi EPS — nghe + đọc, 70 phút", "EPS 시험 정보 — 듣기+읽기, 70분"),
    url: "https://www.topik.go.kr/usr/cmm/topikInfo.do",
    badge: "EPS",
  },
];

export const COMMUNITY_TIPS_VI = [
  l("Không quảng cáo — học tập không bị gián đoạn", "광고 없음 — 학습 방해 없음"),
  l("Script nghe + giải thích tiếng Việt sau mỗi câu", "듣기 스크립트 + 문항별 해설"),
  l("Thi thử IBT có đồng hồ + lưu điểm cao nhất", "IBT 모의고사 타이머 + 최고 점수 저장"),
  l("Chấm bài viết Q51–54 theo tiêu chí thi thật", "51–54번 쓰기 실전 기준 채점"),
  l("Luyện gõ tiếng Hàn 30–40 ký tự/phút cho IBT", "IBT 한국어 타이핑 30–40타/분"),
];
