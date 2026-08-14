import type { SalesTemplate } from "@/giu/lib/sales-playbook";

export function buildZaloTemplates(origin: string): SalesTemplate[] {
  const u = {
    merchantSignup: `${origin}/cua-hang`,
    boxes: `${origin}/hop`,
    merchantPanel: `${origin}/cua-hang/panel`,
  };

  return [
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

Đăng ký 2 phút: ${u.merchantSignup}

Anh/chị thử tuần này được không ạ? Em hỗ trợ đăng hộp đầu tiên luôn 🙏`,
    },
    {
      id: "follow-up",
      titleKo: "2차 팔로우업 (3일 후)",
      titleVi: "Nhắc lại sau 3 ngày",
      body: `Chào lại anh/chị [TÊN QUÁN]!

Em nhắn lại về Giu — giải cứu bánh/cafe cuối ngày. Tuần này có vài quán Quận [X] đã đăng hộp rồi.

Chỉ cần 2 phút đăng ký: ${u.merchantSignup}
Vào panel đăng hộp: ${u.merchantPanel}

Em có thể gọi video 5 phút hướng dẫn nếu tiện ạ 📱`,
    },
    {
      id: "after-signup",
      titleKo: "가입 직후 — 첫 박스 등록 안내",
      titleVi: "Sau khi quán đăng ký",
      body: `Cảm ơn anh/chị đã tham gia Giu! 🎉

Bước tiếp theo (mỗi ngày 18h30–19h):
1. Vào ${u.merchantPanel}
2. Nhập SĐT quán → Đăng hộp mới
3. Ghi tên hộp, giá gốc, giá giảm, số lượng
4. Khách giữ chỗ → tới quán 19h–21h → đọc mã → thanh toán

Link cho khách săn hộp: ${u.boxes}

Có gì nhắn em nhé!`,
    },
    {
      id: "customer-fb",
      titleKo: "고객용 — Facebook/Story",
      titleVi: "Khách hàng — Facebook/Story",
      body: `🥐 Săn hộp giải cứu cuối ngày TP.HCM!

Bánh & cà phê giảm 50–70% — Quận 1, 3, 7
Giờ vàng 19h–21h | Đặt là có mã lấy hàng

👉 ${u.boxes}

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
}
