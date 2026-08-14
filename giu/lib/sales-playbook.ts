export type SalesTemplate = {
  id: string;
  titleKo: string;
  titleVi: string;
  body: string;
  noteKo?: string;
};

export const GIU_TARGET_DISTRICTS = [
  "Quận 1",
  "Quận 3",
  "Quận 7",
  "Quận 5",
  "Quận 10",
  "Bình Thạnh",
  "Phú Nhuận",
] as const;

export const GIU_WEEK_ONE_PLAN = [
  { day: "1–2", ko: "Google Maps → 베이커리·카페 50곳 리스트", vi: "Maps: 50 tiệm bánh/cafe Quận 1,3,7" },
  { day: "3–4", ko: "Zalo 30통 (아래 템플릿)", vi: "Gửi 30 tin Zalo (mẫu bên dưới)" },
  { day: "5", ko: "가입 10곳 목표 — 패널에서 박스 등록 도와주기", vi: "Mục tiêu 10 quán — hướng dẫn đăng hộp" },
  { day: "6–7", ko: "Facebook/Instagram 스토리 + 첫 예약 스크린샷", vi: "Story FB/IG + screenshot đặt đầu tiên" },
] as const;

export const GIU_OBJECTIONS = [
  {
    q: "Phí 12% có đắt không?",
    a: "Chỉ trả khi bán được. Đồ sắp vứt = 0đ. Bán hộp giảm giá = thu về 88%.",
    ko: "12%는 판매됐을 때만. 버릴 거 = 0원.",
  },
  {
    q: "Khách không tới lấy?",
    a: "Khách có mã + SĐT. Quán xác nhận trong panel. Em hỗ trợ nhắc khách qua Zalo.",
    ko: "노쇼는 패널에서 관리, Zalo 리마인드.",
  },
  {
    q: "Cần app không?",
    a: "Không. Web Giu — quán & khách đều dùng link.",
    ko: "앱 필요 없음, 링크만.",
  },
] as const;
