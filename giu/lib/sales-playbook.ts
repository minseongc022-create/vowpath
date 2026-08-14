import { GIU_SALES_URLS } from "@/giu/lib/urls";

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

const u = GIU_SALES_URLS;

export const GIU_ZALO_TEMPLATES: SalesTemplate[] = [
  {
    id: "cold-bakery",
    titleKo: "1차 DM — 베이커리/카페",
    titleVi: "Tin nhắn lần 1 — tiệm bánh/cafe",
    noteKo: "Maps에서 가게 이름·Zalo 넣어서 개인화",
    body: `Chào anh/chị [TÊN QUÁN] 👋

Em là [TÊN] từ Giu — app giải cứu đồ ngon cuối ngày tại TP.HCM (giống Too Good To Go).

Cuối ngày bánh/cà phê còn dư, mình đăng "hộp bất ngờ" giảm 50–70% — khách đặt trước, tới quán lấy 19h–21h, trả tiền tại quán.

✅ Đăng quán MIỄN PHÍ
✅ Phí nền tảng 12% chỉ khi có giao dịch
✅ Không cần app — link web là xong

Đăng ký 2 phút: ${u.merchantSignup()}

Anh/chị thử tuần này được không ạ? Em hỗ trợ đăng hộp đầu tiên luôn 🙏`,
  },
  {
    id: "follow-up",
    titleKo: "2차 팔로우업 (3일 후)",
    titleVi: "Nhắc lại sau 3 ngày",
    body: `Chào lại anh/chị [TÊN QUÁN]!

Em nhắn lại về Giu — giải cứu bánh/cafe cuối ngày. Tuần này có vài quán Quận [X] đã đăng hộp rồi.

Chỉ cần 2 phút đăng ký: ${u.merchantSignup()}
Vào panel đăng hộp: ${u.merchantPanel()}

Em có thể gọi video 5 phút hướng dẫn nếu tiện ạ 📱`,
  },
  {
    id: "after-signup",
    titleKo: "가입 직후 — 첫 박스 등록 안내",
    titleVi: "Sau khi quán đăng ký",
    body: `Cảm ơn anh/chị đã tham gia Giu! 🎉

Bước tiếp theo (mỗi ngày 18h30–19h):
1. Vào ${u.merchantPanel()}
2. Nhập SĐT quán → Đăng hộp mới
3. Ghi tên hộp, giá gốc, giá giảm, số lượng
4. Khách giữ chỗ → tới quán 19h–21h → đọc mã → thanh toán

Link cho khách săn hộp: ${u.boxes()}

Có gì nhắn em nhé!`,
  },
  {
    id: "customer-fb",
    titleKo: "고객용 — Facebook/Story",
    titleVi: "Khách hàng — Facebook/Story",
    body: `🥐 Săn hộp giải cứu cuối ngày TP.HCM!

Bánh & cà phê giảm 50–70% — Quận 1, 3, 7
Giờ vàng 19h–21h | Đặt là có mã lấy hàng

👉 ${u.boxes()}

#Giu #GiaiCuu #TPHCM #AnNgon`,
  },
  {
    id: "maps-search",
    titleKo: "Maps 검색 키워드",
    titleVi: "Từ khóa Google Maps",
    noteKo: "HCMC 각 구별로 검색",
    body: `tiệm bánh Quận 1
bánh mì Quận 1
bakery District 1 Ho Chi Minh
cafe Quận 3
tiệm bánh ngọt Quận 7
boulangerie Saigon`,
  },
];

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
